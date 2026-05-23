import sharp from "sharp";
import { getConfiguredCloudinary, isCloudinaryConfigured } from "./cloudinary";

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

/**
 * Generate an AI image from a prompt using Pollinations.ai (free, no API key),
 * then upload to Cloudinary for permanence. Returns the Cloudinary URL or null.
 */
export async function generateAIImage(
  prompt: string,
  options: { folder?: string; width?: number; height?: number; seed?: number } = {}
): Promise<string | null> {
  if (!prompt.trim()) return null;
  const width = options.width ?? 1024;
  const height = options.height ?? 768;
  const seed = options.seed ?? Math.floor(Math.random() * 1_000_000);

  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`AI image generation HTTP ${response.status}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (!isCloudinaryConfigured()) {
      // No cloud — return the source URL directly (cached by Pollinations CDN)
      return url;
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
