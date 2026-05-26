import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

import { pickProviderCategoriesAI } from "../src/lib/category-picker-ai";

const cases = [
  {
    label: "Kristupas — herbal healer (the original bug)",
    title: "Kristupas",
    rawText:
      "Žolelininkas, 10 metų patirtis gydyme su žolelėmis. Konsultuoju klientus dėl įvairių sveikatos negalavimų — virškinimo, miego, imuniteto. Naudoju tradicinę liaudies mediciną. Galimas vizitas pas mane Palangoje arba video konsultacija.",
  },
  {
    label: "Santechnikas (should pick Statybos, NOT Buitinės)",
    title: "Tomas",
    rawText:
      "Santechnikos darbai Vilniuje — vamzdžių keitimas, šildymo sistemų montavimas, čiaupų remontas, dujinio katilo aptarnavimas. Skubi pagalba 24/7. 15 metų patirtis.",
  },
  {
    label: "Kosmetologė (should pick Grožio, NOT Sveikata)",
    title: "Inga",
    rawText:
      "Veido procedūros, hialurono injekcijos, biorevitalizacija. Sertifikuota kosmetologė su 8 metų patirtimi. Dirbu savo salone Kaune.",
  },
];

async function main() {
  for (const c of cases) {
    console.log("\n" + "=".repeat(70));
    console.log("CASE:", c.label);
    console.log("=".repeat(70));
    const start = Date.now();
    try {
      const result = await pickProviderCategoriesAI({
        rawText: c.rawText,
        title: c.title,
      });
      console.log(`Took ${Date.now() - start}ms`);
      console.log("Roots:", result.pickedRootNames);
      console.log("Leaves:", result.pickedLeafNames);
      console.log("Total IDs:", result.categoryIds.length);
      console.log("Slugs:", result.slugs);
    } catch (err) {
      console.error("ERROR:", err);
    }
  }
  process.exit(0);
}

main();
