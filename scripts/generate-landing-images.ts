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

  "santechnikas-vilniuje": [
    { key: "hero", width: 1536, height: 1024, prompt: `Lithuanian male plumber in clean grey work clothes installing a white wall-mounted radiator in a bright modern Vilnius apartment, warm daylight, professional tools, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of plumber hands tightening a chrome valve on heating pipes with a wrench, neat copper connections, clean wall, soft light, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `Plumber in grey uniform discussing a heating and plumbing plan with a homeowner at a kitchen table in a bright apartment, friendly trustworthy mood, ${NO_TEXT}` },
  ],
  "santechnikas-klaipedoje": [
    { key: "hero", width: 1536, height: 1024, prompt: `Lithuanian male plumber in dark blue overalls connecting a white wall-mounted water heater / boiler in a bright utility room, cool clean light, professional, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of plumber hands wrapping thread tape and joining a flexible hose to a water heater inlet, technical detail, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `Plumber showing a tablet with a quote to a young homeowner couple in a bright bathroom doorway, approachable mood, ${NO_TEXT}` },
  ],
  "elektrikas-vilniuje": [
    { key: "hero", width: 1536, height: 1024, prompt: `Lithuanian male electrician on a ladder installing a modern ceiling light fixture in a bright stylish Vilnius living room, warm evening light, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of electrician hands wiring a white ceiling light connector block, neat colored wires, no faces, soft light, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `Electrician in a branded polo reviewing an electrical layout on paper with a homeowner in a modern apartment, collaborative mood, ${NO_TEXT}` },
  ],
  "elektrikas-klaipedoje": [
    { key: "hero", width: 1536, height: 1024, prompt: `Lithuanian male electrician installing a white EV home charging station on an exterior house wall, daylight, modern single-family home in Lithuania, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of electrician hands working inside an open electrical meter cabinet with circuit breakers, technical detail, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `Electrician with a clipboard talking to a homeowner in a garage next to an electrical panel, practical friendly mood, ${NO_TEXT}` },
  ],
  "trinkeliu-klojimas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `Two Lithuanian paving workers laying grey concrete paving stones on a residential driveway in front of a modern house, sunny day, rubber mallet, sand bedding, outdoor scene, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of gloved hands placing a grey concrete paver into sand, perfectly aligned rows, outdoor daylight, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A paving contractor in a hi-vis vest discussing a yard paving plan with a homeowner in a garden, pointing at the ground, golden hour, ${NO_TEXT}` },
  ],
  "plyteliu-klijavimas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `Lithuanian male tiler kneeling and applying large light-grey wall tiles in a modern bathroom under renovation, notched trowel and spacers, bright clean light, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of tiler hands pressing a square tile onto adhesive comb lines on a wall, tile spacers visible, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A tiler showing tile and grout samples to a woman homeowner in a bathroom being renovated, natural light, collaborative mood, ${NO_TEXT}` },
  ],
  "kanalizacijos-valymas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `Lithuanian drainage technician in dark uniform and gloves operating a powered drain-cleaning auger machine next to a bathroom floor drain, focused, indoor, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of gloved hands feeding a steel drain-cleaning cable into a pipe opening, water and tools, technical detail, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A drainage technician explaining a clogged-pipe solution to a homeowner in a kitchen, reassuring professional mood, ${NO_TEXT}` },
  ],
  "kanalizacijos-valymas-vilniuje": [
    { key: "hero", width: 1536, height: 1024, prompt: `Lithuanian technician using a high-pressure water jetting hose to clean an outdoor sewer manhole in a residential yard, daylight, service van blurred in background, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of a high-pressure jetting nozzle and hose entering a sewer pipe, splashing water, technical detail, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A uniformed drainage specialist talking with a homeowner near an open outdoor manhole, clipboard, practical mood, ${NO_TEXT}` },
  ],
  "gipso-kartono-montavimas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `Lithuanian male builder screwing a plasterboard / drywall sheet onto a metal stud frame in a half-finished room, dust, bright work light, renovation scene, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of hands driving a screw into a plasterboard sheet with a cordless screwdriver, metal frame visible, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A drywall installer showing a partition layout plan to a homeowner in a room under construction, natural light, ${NO_TEXT}` },
  ],
  "langu-valymas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `Lithuanian professional window cleaner using a squeegee on a large floor-to-ceiling window in a bright modern apartment, clear sunny view outside, clean fresh mood, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of a hand pulling a squeegee across a soapy glass window leaving a clean streak, sunlight, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A friendly window-cleaning professional in a polo shirt with a bucket and squeegee smiling in a bright living room with large clean windows, ${NO_TEXT}` },
  ],

  "apdailos-darbai-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `A plasterer in white overalls smoothing a wall with a wide trowel in a sunlit half-renovated apartment room, bare plaster, a ladder and tools nearby, warm dusty authentic renovation atmosphere, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of a paint roller applying warm beige paint to a wall in clean even strokes, paint tray in the foreground, soft side light, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `An interior finisher and a woman homeowner reviewing a colour and material sample board together in a room mid-renovation, natural window light, collaborative mood, ${NO_TEXT}` },
  ],

  "grindu-betonavimas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `Two Lithuanian construction workers in rubber boots leveling wet grey concrete with a long screed board across a large empty floor of a building under construction, cool industrial daylight, wide scene, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of a power trowel machine smoothing a fresh wet concrete floor surface, glossy grey finish, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A construction foreman in a hard hat reviewing a floor plan on a clipboard with a client inside a bare concrete shell of a new building, ${NO_TEXT}` },
  ],
  "laminato-klojimas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `A Lithuanian flooring installer kneeling and clicking light oak laminate planks together on the floor of a bright modern living room, warm wood tones, knee pads, tidy, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of hands tapping a laminate floor plank into place with a tapping block and mallet, warm wood texture, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A flooring specialist showing laminate sample boards to a young couple on a freshly prepared subfloor in a bright apartment, ${NO_TEXT}` },
  ],
  "fasado-siltinimas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `Workers on scaffolding fixing white polystyrene insulation panels to the exterior facade of a multi-storey Lithuanian house, bright daylight, outdoor renovation scene, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of gloved hands pressing a white EPS foam insulation board onto an adhesive-covered exterior wall, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A facade insulation specialist in a hard hat pointing at a house wall and explaining the plan to a homeowner outdoors, ${NO_TEXT}` },
  ],
  "tvoros-montavimas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `Two workers installing a modern grey horizontal-slat metal fence along the edge of a residential garden, sunny day, green lawn, outdoor, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of hands using a level and drill to fix a fence panel to a metal post, neat alignment, outdoor, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A fencing contractor measuring a garden boundary with a tape and discussing options with a homeowner, sunny yard, ${NO_TEXT}` },
  ],
  "duru-montavimas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `A Lithuanian carpenter fitting a white interior door into a doorway frame in a bright modern apartment, level and screwdriver, focused, warm light, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of hands adjusting a door hinge with a screwdriver on a white interior door, precise detail, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A door installer showing door handle and finish samples to a homeowner in a bright hallway, ${NO_TEXT}` },
  ],
  "kaminu-valymas-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `A professional chimney sweep in dark clothing and cap cleaning a red brick chimney with a long brush on the rooftop of a Lithuanian house, blue sky, golden light, outdoor, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of hands feeding a round chimney-cleaning brush on flexible rods into a flue, soot, technical detail, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A chimney sweep talking with a homeowner next to a wood stove inside a cozy house, holding cleaning tools, ${NO_TEXT}` },
  ],
  "baldu-surinkimas-vilniuje": [
    { key: "hero", width: 1536, height: 1024, prompt: `A friendly Lithuanian handyman assembling a white flat-pack wardrobe with an allen key in a bright modern Vilnius bedroom, cardboard packaging nearby, tidy, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of hands tightening a furniture cam-lock screw on a white particle-board shelf with a screwdriver, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A handyman with a cordless drill smiling next to a newly assembled bookshelf in a bright living room, satisfied client in background, ${NO_TEXT}` },
  ],
  "stogo-dengimas-vilniuje": [
    { key: "hero", width: 1536, height: 1024, prompt: `A roofer fastening dark ceramic roof tiles on a pitched roof of a townhouse, viewed from a lower angle against a soft cloudy sky, Vilnius suburb, outdoor, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of hands aligning and nailing a ceramic roof tile on roof battens, precise detail, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A roofing contractor showing roof tile samples and a sketch to a homeowner in front of a house, daylight, ${NO_TEXT}` },
  ],

  "elektros-instaliacija-kaune": [
    { key: "hero", width: 1536, height: 1024, prompt: `A Lithuanian electrician pulling electrical cables through plastic conduits in the chased walls of an apartment under renovation, exposed wiring, bright work light, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of hands routing colored electrical cables into a wall-mounted junction box on a bare wall, neat work, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `An electrician marking socket positions on a bare wall while discussing the wiring plan with a homeowner in a renovation, ${NO_TEXT}` },
  ],
  "grindu-betonavimas-vilniuje": [
    { key: "hero", width: 1536, height: 1024, prompt: `Workers pouring grey concrete from a thick pump hose onto a reinforced floor inside a building under construction in Vilnius, wet concrete spreading, industrial daylight, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of rubber boots and a screed rake spreading fresh wet concrete over steel reinforcement mesh, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A foreman in a hi-vis vest and hard hat reviewing floor plans with a client on a raw concrete construction site, ${NO_TEXT}` },
  ],
  "plyteliu-klijavimas-vilniuje": [
    { key: "hero", width: 1536, height: 1024, prompt: `A Lithuanian tiler laying large light-grey floor tiles in a bright modern Vilnius kitchen, kneeling on a tiling mat, notched trowel and level, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of hands lowering a large floor tile onto adhesive comb lines with tile levelling clips, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A tiler holding a large-format tile and discussing the layout with a homeowner in a bright kitchen, ${NO_TEXT}` },
  ],
  "laminato-klojimas-vilniuje": [
    { key: "hero", width: 1536, height: 1024, prompt: `A flooring installer laying herringbone-pattern oak laminate in a sunny spacious Vilnius living room, warm wood tones, low camera angle along the floor, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of two herringbone laminate planks being clicked together at an angle on the floor, warm wood grain, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A flooring specialist and a homeowner comparing wood-tone laminate samples on a sunlit prepared floor, ${NO_TEXT}` },
  ],
  "apdailos-darbai-vilniuje": [
    { key: "hero", width: 1536, height: 1024, prompt: `A painter in white overalls rolling fresh white paint on a ceiling of a bright newly renovated Vilnius apartment, telescopic roller, clean modern, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of a wide spatula skimming smooth white filler over a wall corner, fine finishing, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `An interior finisher with a tablet walking a homeowner through a renovation plan in a partly finished bright room, ${NO_TEXT}` },
  ],
  "fasado-siltinimas-vilniuje": [
    { key: "hero", width: 1536, height: 1024, prompt: `A worker on scaffolding applying textured decorative render onto an insulated facade of a Vilnius house with a steel trowel, bright daylight, outdoor, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of a steel float spreading white decorative facade plaster over insulation mesh, texture detail, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A facade specialist showing render colour and texture samples to a homeowner outdoors near a house, ${NO_TEXT}` },
  ],
  "tvoros-montavimas-vilniuje": [
    { key: "hero", width: 1536, height: 1024, prompt: `Two workers installing a modern vertical wooden slat fence with dark posts along a residential property in Vilnius, green lawn, sunny day, outdoor, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of hands screwing a wooden fence board onto a dark metal post with a drill, neat spacing, outdoor, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A fencing contractor with a tape measure and tablet discussing fence styles with a homeowner in a garden, ${NO_TEXT}` },
  ],
  "duru-montavimas-vilniuje": [
    { key: "hero", width: 1536, height: 1024, prompt: `A carpenter installing a modern dark wooden front entrance door of a Vilnius house, fitting the frame, daylight, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of hands fitting a stainless door lock and handle into an entrance door, precise detail, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A door installer showing entrance door finishes and handles to a homeowner in a bright hallway, ${NO_TEXT}` },
  ],
  "elektrikas-siauliuose": [
    { key: "hero", width: 1536, height: 1024, prompt: `A Lithuanian electrician testing a residential consumer unit with a multimeter, focused expression, modern apartment in Siauliai, warm light, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of an electrician hand holding a multimeter probe against a circuit breaker terminal, technical detail, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `An electrician explaining a fuse box to a homeowner in a utility area, friendly professional mood, ${NO_TEXT}` },
  ],
  "santechnikas-panevezyje": [
    { key: "hero", width: 1536, height: 1024, prompt: `A Lithuanian plumber installing a wall-hung white toilet in a modern bathroom in Panevezys, level and tools, bright clean light, ${NO_TEXT}` },
    { key: "work", width: 1024, height: 1024, prompt: `Close-up of hands connecting a flexible water supply hose to a toilet cistern inlet, chrome fitting, no faces, ${NO_TEXT}` },
    { key: "consult", width: 1024, height: 1024, prompt: `A plumber discussing a bathroom fixture plan with a homeowner in a bright modern bathroom, ${NO_TEXT}` },
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
