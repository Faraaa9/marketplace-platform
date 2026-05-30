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

  "stogo-dengimas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `Wide elevated drone-style view of two roofers in orange hi-vis vests installing dark metal roofing tiles on a steep pitched roof of a modern Lithuanian single-family house, bright blue sky, late afternoon golden sunlight, expansive outdoor scene, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Macro close-up of gloved hands fastening a standing-seam metal roof panel with a tool, sharp technical detail, water-tight seam, soft overcast daylight, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A roofer in an orange hi-vis vest standing in a green garden pointing up toward a house roof while talking with a middle-aged homeowner, both viewed from behind and side, warm golden-hour backlight, ${NO_TEXT}` },
  ],

  "kondicionieriu-montavimas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `A female HVAC technician on a small step ladder installing a sleek white wall-mounted split air conditioner in a bright minimalist Scandinavian living room, cool clean blue-and-white palette, soft diffused daylight, modern, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of technician hands connecting copper refrigerant lines to a white outdoor air-conditioning compressor unit mounted on an apartment balcony exterior wall, precise technical detail, cool daylight, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A young male technician in a light grey branded polo shirt showing air-conditioner options on a tablet to a smiling young couple in a sunny modern apartment, friendly approachable mood, ${NO_TEXT}` },
  ],

  "apdailos-darbai-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `A plasterer in white overalls smoothing a wall with a wide trowel in a sunlit half-renovated apartment room, bare plaster, a ladder and tools nearby, warm dusty authentic renovation atmosphere, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of a paint roller applying warm beige paint to a wall in clean even strokes, paint tray in the foreground, soft side light, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `An interior finisher and a woman homeowner reviewing a colour and material sample board together in a room mid-renovation, natural window light, collaborative mood, ${NO_TEXT}` },
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
