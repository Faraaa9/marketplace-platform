import { prisma } from "@/lib/prisma";

/**
 * Two-pass AI category picker for provider profile auto-generation.
 *
 * Pass 1: pick 1–3 ROOTS from the 26 canonical paslaugurinka-taxonomy roots,
 *         using the user's raw input (not the AI marketing rewrite, which
 *         drowns matching in generic words like "specialistas"/"konsultacija").
 * Pass 2: load depth-1 subcategories ONLY under the selected roots, ask the
 *         model to pick only the ones (1–4) that directly match — favouring
 *         precision over filling a quota.
 *
 * Returns the specific depth-1 sub-category IDs (deduped) — written 1:1 into
 * provider_profile_categories. The broad roots are NOT saved (less filter
 * noise); they're only kept as a fallback when no sub-category matched, so a
 * profile is never left with zero categories. Categories from other taxonomy
 * sources (legacy paslaugos.lt rows) are deliberately excluded.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-haiku-4.5";
const TAXONOMY_SOURCE = "paslaugurinka-taxonomy";

const MAX_ROOTS = 3;
const MAX_LEAVES = 4;
const MIN_CONFIDENCE = 0.6;
const SAMPLE_CHILDREN_PER_ROOT = 8;

export interface CategoryPickerInput {
  rawText: string;
  title?: string;
}

export interface CategoryPickerResult {
  categoryIds: string[];
  slugs: string[];
  pickedRootNames: string[];
  pickedLeafNames: string[];
}

const EMPTY_RESULT: CategoryPickerResult = {
  categoryIds: [],
  slugs: [],
  pickedRootNames: [],
  pickedLeafNames: [],
};

// Claude Haiku occasionally wraps JSON in ```json fences despite response_format.
// Strip fences, fall back to extracting the first {...} block.
function parseJsonLoose(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

interface RootRow {
  id: string;
  name: string;
  slug: string;
  children: { name: string }[];
}

interface LeafRow {
  id: string;
  name: string;
  slug: string;
  depth: number;
  parent: { name: string } | null;
  root: { name: string } | null;
}

export async function pickProviderCategoriesAI(
  input: CategoryPickerInput,
): Promise<CategoryPickerResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("pickProviderCategoriesAI: OPENROUTER_API_KEY missing");
    return EMPTY_RESULT;
  }
  if (!input.rawText || input.rawText.trim().length < 10) {
    return EMPTY_RESULT;
  }

  const roots = await prisma.category.findMany({
    where: {
      depth: 0,
      externalSource: TAXONOMY_SOURCE,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      children: {
        where: {
          isActive: true,
          externalSource: TAXONOMY_SOURCE,
        },
        select: { name: true },
        orderBy: { sortOrder: "asc" },
        take: SAMPLE_CHILDREN_PER_ROOT,
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  if (roots.length === 0) return EMPTY_RESULT;

  const selectedRoots = await pickRoots(input, roots, apiKey);
  if (selectedRoots.length === 0) return EMPTY_RESULT;

  const selectedRootIds = selectedRoots.map((r) => r.id);

  const leaves = await prisma.category.findMany({
    where: {
      rootId: { in: selectedRootIds },
      depth: 1,
      externalSource: TAXONOMY_SOURCE,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      depth: true,
      parent: { select: { name: true } },
      root: { select: { name: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const selectedLeaves = await pickLeaves(input, leaves, apiKey);

  // Save ONLY the specific sub-categories — keeps profiles precise and avoids
  // broad-root noise in category filters/search. Fall back to the picked roots
  // only when no leaf matched, so a provider never ends up with zero categories.
  const categoryIds =
    selectedLeaves.length > 0
      ? Array.from(new Set(selectedLeaves.map((l) => l.id)))
      : selectedRootIds;
  const slugs =
    selectedLeaves.length > 0
      ? selectedLeaves.map((l) => l.slug)
      : selectedRoots.map((r) => r.slug);

  return {
    categoryIds,
    slugs,
    pickedRootNames: selectedRoots.map((r) => r.name),
    pickedLeafNames: selectedLeaves.map((l) => l.name),
  };
}

async function pickRoots(
  input: CategoryPickerInput,
  roots: RootRow[],
  apiKey: string,
): Promise<RootRow[]> {
  const rootListing = roots
    .map((r, i) => {
      const examples =
        r.children.length > 0
          ? ` (pvz.: ${r.children.map((c) => c.name).join(", ")})`
          : "";
      return `${i + 1}. ${r.name}${examples}`;
    })
    .join("\n");

  const prompt = `Tu padedi paslaugų teikėjui Lietuvoje pasirinkti tinkamas kategorijų grupes paslaugurinka.lt platformoje.

Žemiau yra 26 PAGRINDINĖS kategorijų grupės (šaknys). Tavo užduotis: pažiūrėti į pateiktą paslaugų teikėjo aprašymą ir nustatyti, kurios 1–3 ŠAKNYS semantiškai geriausiai atitinka jo darbą.

PAGRINDINĖS KATEGORIJOS:
${rootListing}

PASLAUGŲ TEIKĖJO APRAŠYMAS (vartotojo originalūs žodžiai):
${input.title ? `Vardas/įmonė: ${input.title}\n` : ""}${input.rawText.slice(0, 2000)}

Taisyklės:
- Pasirink 1–3 šaknis, kurios geriausiai apibrėžia šio teikėjo veiklą.
- ŽIŪRĖK į VISĄ kontekstą, ne į atskirus žodžius. Pvz., "10 metų patirtis" NEREIŠKIA, kad žmogus moko.
- Žolelininkas → "Sveikata, gydymas" + galbūt "Ezoterika, dvasinės paslaugos". NE "Mokymai".
- Santechnikas → "Statybos, apdaila". NE "Buitinės paslaugos", net jei kviečia į namus.
- IT konsultantas → "Internetas, IT". NE "Dokumentai, tyrimai, konsultavimas" vien dėl žodžio "konsultacija".
- Vengk "Kitos paslaugos" — naudok TIK kai tikrai nieko kito nebepritaiko.
- Confidence skalė 0–1. Atmesk jei < 0.5.

Grąžink TIK galiojantį JSON (be markdown, be code fence):
{"roots":[{"name":"Sveikata, gydymas","confidence":0.95,"reason":"trumpas paaiškinimas"}]}`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "paslaugurinka.lt ai-category-pass1",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "Grąžini TIK galiojantį JSON. Be markdown.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("pickRoots: OpenRouter HTTP", response.status);
      return [];
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return [];

    const parsed = parseJsonLoose(content) as {
      roots?: Array<{ name?: string; confidence?: number }>;
    } | null;
    if (!parsed) return [];

    const nameToRoot = new Map(
      roots.map((r) => [r.name.toLowerCase().trim(), r]),
    );
    const picks = (parsed.roots ?? []).filter(
      (p): p is { name: string; confidence: number } =>
        typeof p.name === "string" && (p.confidence ?? 0) >= MIN_CONFIDENCE,
    );

    const result: RootRow[] = [];
    const seen = new Set<string>();
    for (const pick of picks) {
      const root = nameToRoot.get(pick.name.toLowerCase().trim());
      if (!root || seen.has(root.id)) continue;
      seen.add(root.id);
      result.push(root);
      if (result.length >= MAX_ROOTS) break;
    }
    return result;
  } catch (err) {
    console.error("pickRoots error:", err);
    return [];
  }
}

async function pickLeaves(
  input: CategoryPickerInput,
  leaves: LeafRow[],
  apiKey: string,
): Promise<LeafRow[]> {
  if (leaves.length === 0) return [];

  const leafListing = leaves
    .map((l) => {
      const rootName = l.root?.name ?? "?";
      return `${l.slug} | ${rootName} > ${l.name}`;
    })
    .join("\n");

  const prompt = `Tu padedi paslaugų teikėjui pasirinkti TIKSLIAS paslaugų po-kategorijas paslaugurinka.lt platformoje.

Pirmame žingsnyje jau parinkome tinkamas šaknis. Dabar iš jų po-kategorijų pasirink TIK tas (1–4), kurios TIESIOGIAI atitinka šio teikėjo darbą.

GALIMOS PO-KATEGORIJOS (slug | Šaknis > Vardas):
${leafListing}

PASLAUGŲ TEIKĖJO APRAŠYMAS (vartotojo originalūs žodžiai):
${input.title ? `Vardas/įmonė: ${input.title}\n` : ""}${input.rawText.slice(0, 2000)}

Taisyklės:
- Pasirink 1–4 po-kategorijas TIK iš žemiau pateikto sąrašo (naudok slug stulpelį).
- GERIAU MAŽIAU IR TIKSLIAI. Jei tinka tik viena — grąžink tik vieną. NEPILDYK iki kažkokio skaičiaus.
- Rink TIK tai, ką teikėjas realiai daro. Pvz. elektrikas NETEIKIA dujų — nesirink "dujų tiekimo" vien todėl, kad jis toje pačioje šaknyje.
- NEKURK naujų — jei sąraše nėra tikslaus atitikmens, nesirink.
- Pirmenybę teik konkrečioms (pvz. "Žolininkystė", ne "Sveikata bendrai").
- Confidence skalė 0–1. Atmesk jei < 0.6.
- "reason" trumpas (iki 80 simbolių).

Grąžink TIK galiojantį JSON:
{"leaves":[{"slug":"existing-slug","confidence":0.92,"reason":"..."}]}`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "paslaugurinka.lt ai-category-pass2",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "Grąžini TIK galiojantį JSON. Be markdown.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error("pickLeaves: OpenRouter HTTP", response.status);
      return [];
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return [];

    const parsed = parseJsonLoose(content) as {
      leaves?: Array<{ slug?: string; confidence?: number }>;
    } | null;
    if (!parsed) return [];

    const slugToLeaf = new Map(leaves.map((l) => [l.slug, l]));
    const result: LeafRow[] = [];
    const seen = new Set<string>();
    for (const pick of parsed.leaves ?? []) {
      if (typeof pick.slug !== "string") continue;
      if ((pick.confidence ?? 0) < MIN_CONFIDENCE) continue;
      const leaf = slugToLeaf.get(pick.slug);
      if (!leaf || seen.has(leaf.id)) continue;
      seen.add(leaf.id);
      result.push(leaf);
      if (result.length >= MAX_LEAVES) break;
    }
    return result;
  } catch (err) {
    console.error("pickLeaves error:", err);
    return [];
  }
}
