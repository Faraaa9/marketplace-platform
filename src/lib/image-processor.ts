import sharp from "sharp";
import { getConfiguredCloudinary, isCloudinaryConfigured } from "./cloudinary";
import { resolveModel, resolvePrompt } from "@/lib/ai/prompt-config";

interface ProcessOptions {
  // Crop the bottom % of the image — useful for paslaugos.lt watermark
  cropBottomPercent?: number;
  // Cloudinary folder for uploads
  folder?: string;
}

/**
 * Sources that need the bottom-right watermark/logo cropped out
 */
const WATERMARKED_SOURCES = [/paslaugos-img\.dgn\.lt/i, /paslaugos\.lt/i];

function shouldCropWatermark(url: string): boolean {
  return WATERMARKED_SOURCES.some((re) => re.test(url));
}

/**
 * Download an image from a URL, optionally crop the bottom (to remove
 * source watermarks), and upload to Cloudinary. Returns the Cloudinary URL.
 *
 * If processing fails for any reason, falls back to the original URL so the
 * profile is still created.
 */
export async function processAndUploadImage(
  sourceUrl: string,
  options: ProcessOptions = {}
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    return sourceUrl;
  }

  try {
    // 1. Download the original
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return sourceUrl;

    const buffer = Buffer.from(await response.arrayBuffer());

    // 2. Crop if needed
    let processed: Buffer = buffer;
    const cropPercent =
      options.cropBottomPercent ??
      (shouldCropWatermark(sourceUrl) ? 10 : 0);

    if (cropPercent > 0) {
      const meta = await sharp(buffer).metadata();
      if (meta.height && meta.width) {
        const cropHeight = Math.floor(meta.height * (1 - cropPercent / 100));
        processed = await sharp(buffer)
          .extract({
            left: 0,
            top: 0,
            width: meta.width,
            height: cropHeight,
          })
          .jpeg({ quality: 88, progressive: true })
          .toBuffer();
      }
    }

    // 3. Upload to Cloudinary
    const cloudinary = getConfiguredCloudinary();
    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: options.folder || "provider-imports",
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          },
          (err, result) => {
            if (err || !result) return reject(err);
            resolve(result as { secure_url: string });
          }
        );
        stream.end(processed);
      }
    );

    return uploadResult.secure_url;
  } catch (error) {
    console.warn(
      `Failed to process image ${sourceUrl}, using original:`,
      error instanceof Error ? error.message : error
    );
    return sourceUrl;
  }
}

// Default to a Gemini 3-class image model. Can be overridden per environment
// (e.g. when a newer preview ID becomes available) via OPENROUTER_IMAGE_MODEL.
// Must be at least Gemini 3.1 quality — older Gemini 2.x image models and the
// previously used Pollinations flux model are not acceptable for new profiles.
export const DEFAULT_IMAGE_MODEL = "google/gemini-3-pro-image-preview";

/**
 * Generate an AI image from a prompt via OpenRouter using a Gemini 3-class
 * model, then upload to Cloudinary for permanence. Returns the Cloudinary URL
 * (or the raw base64 data URL if Cloudinary is unconfigured) or null.
 */
export async function generateAIImage(
  prompt: string,
  options: { folder?: string; width?: number; height?: number; seed?: number } = {}
): Promise<string | null> {
  if (!prompt.trim()) return null;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("OPENROUTER_API_KEY not configured — skipping AI image gen");
    return null;
  }

  const model = await resolveModel(
    "image_generate",
    process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
  );
  const width = options.width ?? 1024;
  const height = options.height ?? 768;
  const userPrompt = await resolvePrompt("image_generate", "user", { prompt, width, height });

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          modalities: ["image", "text"],
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `AI image generation HTTP ${response.status}: ${detail.slice(0, 200)}`
      );
      return null;
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    const imageUrl: string | undefined =
      message?.images?.[0]?.image_url?.url ||
      message?.images?.[0]?.url ||
      (typeof message?.content === "string" ? undefined : undefined);

    if (!imageUrl) {
      console.warn("AI image generation: no image in response", {
        model,
        hasMessage: Boolean(message),
      });
      return null;
    }

    // The image comes back as a base64 data URL (data:image/png;base64,...)
    const buffer = await dataUrlOrHttpToBuffer(imageUrl);
    if (!buffer) {
      console.warn("AI image generation: failed to decode image data");
      return null;
    }

    if (!isCloudinaryConfigured()) {
      return imageUrl;
    }

    const cloudinary = getConfiguredCloudinary();
    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: options.folder || "provider-ai-generated",
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          },
          (err, result) => {
            if (err || !result) return reject(err);
            resolve(result as { secure_url: string });
          }
        );
        stream.end(buffer);
      }
    );

    return uploadResult.secure_url;
  } catch (error) {
    console.warn(
      "AI image generation failed:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function dataUrlOrHttpToBuffer(src: string): Promise<Buffer | null> {
  try {
    if (src.startsWith("data:")) {
      const comma = src.indexOf(",");
      if (comma === -1) return null;
      const meta = src.slice(0, comma);
      const payload = src.slice(comma + 1);
      if (meta.includes(";base64")) {
        return Buffer.from(payload, "base64");
      }
      return Buffer.from(decodeURIComponent(payload), "utf-8");
    }
    const res = await fetch(src);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Process multiple images in parallel with a concurrency cap.
 */
export async function processImagesBatch(
  urls: string[],
  options: ProcessOptions = {}
): Promise<string[]> {
  const CONCURRENCY = 3;
  const results: string[] = new Array(urls.length);

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const processed = await Promise.all(
      batch.map((url) => processAndUploadImage(url, options))
    );
    for (let j = 0; j < processed.length; j++) {
      results[i + j] = processed[j];
    }
  }

  return results;
}
