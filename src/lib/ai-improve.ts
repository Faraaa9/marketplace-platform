import type { ImproveDescriptionInput } from "@/lib/validations";
import { getFlatServiceCategories } from "@/lib/service-categories";
import { pickCategoryOverrideSlug } from "@/lib/category-overrides";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Gemini handles Lithuanian grammar/nuance best of the OpenRouter models.
// 2.5-flash lets us turn reasoning off (3.x flash forces it), so this short
// cleanup task stays fast and the whole token budget goes to the answer.
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Build the curated-category prompt list (`slug (Pavadinimas)`, grouped by
 * root) and the valid-slug set used to validate the model's answer. The
 * taxonomy lives in the DB, so this resolves at call time.
 */
const normalizeForMatch = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ");

function scoreCategory(query: string, haystack: string, depth = 0): number {
  const normalizedHaystack = normalizeForMatch(haystack);
  const tokens = normalizeForMatch(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
  let score = depth >= 2 ? 3 : 0;
  for (const token of tokens) {
    if (normalizedHaystack.includes(token)) score += token.length;
  }
  if (tokens.length > 0 && normalizedHaystack.includes(tokens.join(" "))) score += 20;
  return score;
}

async function getCategoryPromptData(input: ImproveDescriptionInput): Promise<{ list: string; validSlugs: Set<string> }> {
  const categories = await getFlatServiceCategories();
  const byId = new Map(categories.map((category) => [category.id, category]));
  const query = `${input.title ?? ""} ${input.category ?? ""} ${input.description}`;

  const candidates = categories
    .filter((category) => (category.depth ?? 0) > 0)
    .map((category) => {
      const names: string[] = [category.name];
      let parent = category.parentId ? byId.get(category.parentId) : undefined;
      while (parent) {
        names.unshift(parent.name);
        parent = parent.parentId ? byId.get(parent.parentId) : undefined;
      }
      const breadcrumb = names.join(" > ");
      return {
        category,
        breadcrumb,
        score: scoreCategory(query, breadcrumb, category.depth),
      };
    })
    .sort((a, b) => b.score - a.score || (b.category.depth ?? 0) - (a.category.depth ?? 0))
    .slice(0, 140);

  const allValidSlugs = new Set(categories.map((category) => category.slug));
  const overrideSlug = pickCategoryOverrideSlug(query, allValidSlugs);
  if (overrideSlug) {
    const overrideCategory = categories.find((category) => category.slug === overrideSlug);
    if (overrideCategory) {
      const names: string[] = [overrideCategory.name];
      let parent = overrideCategory.parentId ? byId.get(overrideCategory.parentId) : undefined;
      while (parent) {
        names.unshift(parent.name);
        parent = parent.parentId ? byId.get(parent.parentId) : undefined;
      }
      const existingIndex = candidates.findIndex(
        (entry) => entry.category.slug === overrideSlug,
      );
      if (existingIndex >= 0) {
        candidates.splice(existingIndex, 1);
      }
      candidates.unshift({
        category: overrideCategory,
        breadcrumb: names.join(" > "),
        score: Number.MAX_SAFE_INTEGER,
      });
    }
  }

  const validSlugs = new Set<string>();
  const lines = candidates.map(({ category, breadcrumb }) => {
    validSlugs.add(category.slug);
    return `${category.slug} (${breadcrumb})`;
  });
  return { list: lines.join("\n"), validSlugs };
}

function buildSystemPrompt(categoryList: string): string {
  return `Tu esi asistentas Lietuvos paslaugų platformoje „paslaugurinka.lt". Klientas rašo užklausą — aprašo, kokios paslaugos jam reikia. Tavo tikslas, kad paslaugų tiekėjas iškart suprastų užduotį ir galėtų ją tiksliai įkainoti.

Grąžink TIK galiojantį JSON objektą su laukais:
{"improvedDescription": "...", "title": "...", "category": "...", "location": "...", "budget": "...", "deadline": "...", "recommendations": [{"prompt": "...", "field": "..."}]}

"improvedDescription" — sutvarkytas kliento aprašymas. PRIVALU grąžinti šį lauką su turinio:
- Ištaisyk rašybos ir gramatikos klaidas, rašyk taisyklinga, natūralia lietuvių kalba.
- Sutvarkyk struktūrą: jei yra keli atskiri dalykai — išdėstyk trumpais punktais (kiekvienas iš naujos eilutės, pradžioje „- "). Jei mintis viena — palik tvarkingą sakinį ar du.
- Glaustai — ne ilgiau nei originalas (daugiausia 1800 simbolių).
- NEIŠGALVOK faktų. Nenaudok detalių, kurių klientas nepaminėjo. Remkis tik kliento pateikta informacija.
- Jei žodis atrodo nestandartinis arba nežinomas, palik jį tokį pat, bet paprašyk kliento patikslinti recommendations dalyje.
- Nepridėk pasisveikinimų, parašų ar komentarų.
- Jei aprašymas jau gerai sutvarktas, grąžink jo struktūruotą versiją su punktais.

"title" — trumpas, konkretus užklausos pavadinimas lietuvių kalba (3–8 žodžiai, daugiausia 70 simbolių). Pvz. „Trinkelių klojimas kieme".

"category" — TIKSLIAI vienas kategorijos kodas (slug) iš šio sąrašo (grąžink tik kodą, ne pavadinimą skliausteliuose). Kategorijos sugrupuotos pagal sritį:
${categoryList}
Parink tinkamiausią konkrečią kategoriją pagal aprašymą.

"location" — vietovė. Jei aprašyme paminėtas miestas, rajonas, miestelis ar kaimas (Lietuvos arba užsienio) — grąžink jį vardininko linksniu ir taisyklinga rašyba (pvz. „Trakų rajone" → „Trakai", „darbai Kaune" → „Kaunas"). Jei vietovė aprašyme nepaminėta — grąžink tuščią eilutę "".

"budget" — biudžetas. Jei aprašyme klientas paminėjo sumą, kainų ribas ar norą derėtis — grąžink trumpai (pvz. „500 €", „300–500 €", „derinama"). Jei apie biudžetą ar pinigus nieko nepasakyta — grąžink tuščią eilutę "".

"deadline" — darbų terminas. Jei klientas paminėjo, kada reikia atlikti darbą (pvz. „skubu", „iki gegužės pabaigos", „per 2 savaites", „šią savaitę") — grąžink trumpai. Jei apie terminą nieko nepasakyta — grąžink tuščią eilutę "".

"recommendations" — 2–4 dalykai, kurių aprašyme TRŪKSTA, kad tiekėjas galėtų tiksliai įkainoti darbą. Kiekvienas objektas:
- "prompt": trumpas, draugiškas raginimas klientui, ką nurodyti (pvz. „Nurodykite kiemo plotą kvadratiniais metrais").
- "field": labai trumpa to dalyko žyma, tinkanti eilutės pradžiai (1–3 žodžiai, pvz. „Plotas (m²)", „Darbų terminas", „Medžiagos").
Neklausk to, kas jau parašyta. Jei aprašymas jau išsamus — grąžink tuščią sąrašą [].

Grąžink TIK JSON, be jokio papildomo teksto.`;
}

export class AiImproveError extends Error {}

export interface ImproveRecommendation {
  prompt: string;
  field: string;
}

export interface ImproveDescriptionResult {
  improvedDescription: string;
  title: string;
  /** A curated category slug, or "" when the model picked nothing valid. */
  category: string;
  location: string;
  budget: string;
  deadline: string;
  recommendations: ImproveRecommendation[];
}

function parseResult(raw: string, validSlugs: Set<string>): ImproveDescriptionResult | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch (err) {
    console.error("AI JSON parse failed:", { raw: raw.slice(0, 200), error: String(err) });
    return null;
  }
  if (!obj || typeof obj !== "object") {
    console.error("AI response not an object:", { raw: raw.slice(0, 200) });
    return null;
  }
  const record = obj as Record<string, unknown>;

  const improvedDescription =
    typeof record.improvedDescription === "string" ? record.improvedDescription.trim() : "";
  if (!improvedDescription) {
    console.error("AI improvedDescription empty or missing", { record: JSON.stringify(record).slice(0, 200) });
    return null;
  }

  const title = typeof record.title === "string" ? record.title.trim().slice(0, 90) : "";

  const rawCategory = (typeof record.category === "string" ? record.category.trim() : "").toLowerCase();
  const category = validSlugs.has(rawCategory) ? rawCategory : "";

  const location =
    typeof record.location === "string" ? record.location.trim().slice(0, 100) : "";

  const budget =
    typeof record.budget === "string" ? record.budget.trim().slice(0, 100) : "";

  const deadline =
    typeof record.deadline === "string" ? record.deadline.trim().slice(0, 100) : "";

  const recommendations: ImproveRecommendation[] = Array.isArray(record.recommendations)
    ? record.recommendations
        .map((item): ImproveRecommendation | null => {
          if (!item || typeof item !== "object") return null;
          const entry = item as Record<string, unknown>;
          const prompt = typeof entry.prompt === "string" ? entry.prompt.trim() : "";
          const field = typeof entry.field === "string" ? entry.field.trim() : "";
          return prompt && field ? { prompt, field } : null;
        })
        .filter((x): x is ImproveRecommendation => x !== null)
        .slice(0, 5)
    : [];

  return { improvedDescription, title, category, location, budget, deadline, recommendations };
}

export async function improveDescription(
  input: ImproveDescriptionInput,
): Promise<ImproveDescriptionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AiImproveError("AI_NOT_CONFIGURED");
  }

  const { list: categoryList, validSlugs } = await getCategoryPromptData(input);
  const systemPrompt = buildSystemPrompt(categoryList);

  const context: string[] = [];
  if (input.category) context.push(`Kategorija: ${input.category}`);
  if (input.title) context.push(`Pavadinimas: ${input.title}`);
  const userContent = `${context.length ? `${context.join("\n")}\n\n` : ""}Aprašymas:\n${input.description}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "paslaugurinka.lt",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        temperature: 0.3,
        max_tokens: 1400,
        reasoning: { enabled: false },
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("OpenRouter klaida:", res.status, detail);
      throw new AiImproveError("AI_REQUEST_FAILED");
    }

    const data = (await res.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | null;
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || raw.trim().length === 0) {
      throw new AiImproveError("AI_EMPTY_RESPONSE");
    }

    const result = parseResult(raw, validSlugs);
    if (!result) {
      throw new AiImproveError("AI_EMPTY_RESPONSE");
    }
    const overrideCategory = pickCategoryOverrideSlug(userContent, validSlugs);
    if (overrideCategory) {
      result.category = overrideCategory;
    }
    return result;
  } catch (err) {
    if (err instanceof AiImproveError) throw err;
    const name = (err as { name?: string } | null)?.name;
    throw new AiImproveError(name === "AbortError" ? "AI_TIMEOUT" : "AI_REQUEST_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}
