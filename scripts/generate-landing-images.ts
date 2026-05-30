/**
 * One-off generator for landing-page hero/section images.
 * Generates via OpenRouter (Gemini 3 image) and uploads to Cloudinary.
 *
 *   npx ts-node --transpile-only scripts/generate-landing-images.ts
 *
 * Prints the resulting Cloudinary URLs to paste into the page. Costs a few
 * cents per image — run intentionally.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { generateAIImage } from "../src/lib/image-processor";

const FOLDER = "landing/elektrikas-kaune";

const IMAGES: Array<{ key: string; prompt: string; width: number; height: number }> = [
  {
    key: "hero",
    width: 1536,
    height: 1024,
    prompt:
      "Professional photorealistic photograph of a friendly Lithuanian male electrician in his 30s wearing clean navy work clothes, calmly working on a modern residential electrical distribution panel in a bright contemporary Kaunas apartment. Warm natural daylight from a window, shallow depth of field, premium trustworthy craftsman feel, neutral near-white interior, no text, no logos, no watermark, high detail, editorial quality.",
  },
  {
    key: "sockets",
    width: 1024,
    height: 1024,
    prompt:
      "Close-up photorealistic photograph of skilled hands of an electrician installing a modern white wall power socket with a screwdriver, neat copper wiring, professional tools nearby, clean light grey wall, soft natural light, shallow depth of field, premium quality, no text, no logos, no watermark.",
  },
  {
    key: "consult",
    width: 1024,
    height: 1024,
    prompt:
      "Photorealistic photograph of a professional Lithuanian electrician with a tablet explaining an electrical plan to a homeowner couple in a bright modern apartment living room, warm friendly atmosphere, trustworthy, natural daylight, neutral near-white tones with subtle warm accents, no text, no logos, no watermark, editorial quality.",
  },
];

async function main() {
  for (const img of IMAGES) {
    process.stdout.write(`Generating "${img.key}" (${img.width}x${img.height})… `);
    const url = await generateAIImage(img.prompt, {
      folder: FOLDER,
      width: img.width,
      height: img.height,
    });
    console.log(url ? `OK\n  ${img.key}: ${url}` : "FAILED (null)");
  }
}

main().then(() => process.exit(0));
