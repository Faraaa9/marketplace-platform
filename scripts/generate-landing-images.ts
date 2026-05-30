/**
 * Generator for landing-page hero/section images (Gemini 3 via OpenRouter →
 * Cloudinary). Reusable per landing page via a registry keyed by page slug.
 *
 *   npx ts-node --transpile-only -r ./scripts/_register-paths.js \
 *     --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     scripts/generate-landing-images.ts <page-key>
 *
 * Prints the resulting Cloudinary URLs to paste into the page config. Costs a
 * few cents per image — run intentionally.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { generateAIImage } from "../src/lib/image-processor";

type Shot = { key: string; prompt: string; width: number; height: number };

const NO_TEXT =
  "no text, no logos, no watermark, high detail, editorial quality, photorealistic.";

const PAGES: Record<string, Shot[]> = {
  "elektrikas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `Friendly Lithuanian male electrician in clean navy work clothes working on a modern residential electrical panel in a bright contemporary Kaunas apartment, warm natural daylight, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of skilled electrician hands installing a modern white wall power socket with a screwdriver, neat copper wiring, clean light grey wall, soft natural light, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `Lithuanian electrician with a tablet explaining an electrical plan to a homeowner couple in a bright modern apartment, warm friendly atmosphere, ${NO_TEXT}` },
  ],
  "santechnikas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `Friendly Lithuanian male plumber in clean work clothes fixing modern chrome pipework under a bathroom sink in a bright contemporary Kaunas apartment, warm natural daylight, professional tools, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of skilled plumber hands installing a chrome faucet / mixer tap on a white sink with a wrench, neat connections, clean modern bathroom, soft natural light, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `Lithuanian plumber showing a tablet and explaining a bathroom plumbing plan to a homeowner in a bright modern apartment, warm trustworthy atmosphere, ${NO_TEXT}` },
  ],
};

async function main() {
  const pageKey = process.argv[2];
  const shots = pageKey ? PAGES[pageKey] : undefined;
  if (!shots) {
    console.error(`Unknown page key. Available: ${Object.keys(PAGES).join(", ")}`);
    process.exit(1);
  }
  for (const img of shots) {
    process.stdout.write(`[${pageKey}] generating "${img.key}" (${img.width}x${img.height})… `);
    const url = await generateAIImage(img.prompt, {
      folder: `landing/${pageKey}`,
      width: img.width,
      height: img.height,
    });
    console.log(url ? `OK\n  ${img.key}: ${url}` : "FAILED (null)");
  }
}

main().then(() => process.exit(0));
