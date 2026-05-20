import { SERVICE_CATEGORIES, LITHUANIAN_CITIES } from "@/lib/constants";
import type { ImproveDescriptionInput } from "@/lib/validations";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Gemini handles Lithuanian grammar/nuance best of the OpenRouter models.
// 2.5-flash lets us turn reasoning off (3.x flash forces it), so this short
// cleanup task stays fast and the whole token budget goes to the answer.
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;

const CATEGORY_VALUES = new Set<string>(SERVICE_CATEGORIES.map((c) => c.value));
const CITY_BY_LOWER = new Map<string, string>(
  LITHUANIAN_CITIES.map((c) => [c.toLowerCase(), c]),
);
const CATEGORY_LIST = SERVICE_CATEGORIES.map((c) => `${c.value} (${c.label})`).join(", ");
const CITY_LIST = LITHUANIAN_CITIES.join(", ");

const SYSTEM_PROMPT = `Tu esi asistentas Lietuvos paslaugų platformoje „paslaugurinka.lt". Klientas rašo užklausą — aprašo, kokios paslaugos jam reikia. Tavo tikslas, kad paslaugų tiekėjas iškart suprastų užduotį ir galėtų ją tiksliai įkainoti.

Grąžink TIK galiojantį JSON objektą su laukais:
{"improvedDescription": "...", "title": "...", "category": "...", "location": "...", "recommendations": [{"prompt": "...", "field": "..."}]}

"improvedDescription" — sutvarkytas kliento aprašymas:
- Ištaisyk rašybos ir gramatikos klaidas, rašyk taisyklinga, natūralia lietuvių kalba.
- Sutvarkyk struktūrą: jei yra keli atskiri dalykai — išdėstyk trumpais punktais (kiekvienas iš naujos eilutės, pradžioje „- "). Jei mintis viena — palik tvarkingą sakinį ar du.
- Glaustai — ne ilgiau nei originalas (daugiausia 1800 simbolių).
- NEIŠGALVOK faktų. Nenaudok detalių, kurių klientas nepaminėjo. Remkis tik kliento pateikta informacija.
- Nepridėk pasisveikinimų, parašų ar komentarų.

"title" — trumpas, konkretus užklausos pavadinimas lietuvių kalba (3–8 žodžiai, daugiausia 70 simbolių). Pvz. „Trinkelių klojimas kieme".

"category" — TIKSLIAI vienas kodas iš šio sąrašo (grąžink tik kodą, ne pavadinimą skliausteliuose): ${CATEGORY_LIST}. Parink tinkamiausią pagal aprašymą.

"location" — miestas. Jei aprašyme paminėtas Lietuvos miestas, grąžink jį TIKSLIAI taip parašytą: ${CITY_LIST}. Jei miestas aprašyme nepaminėtas — grąžink tuščią eilutę "".

"recommendations" — 2–4 dalykai, kurių aprašyme TRŪKSTA, kad tiekėjas galėtų tiksliai įkainoti darbą. Kiekvienas objektas:
- "prompt": trumpas, draugiškas raginimas klientui, ką nurodyti (pvz. „Nurodykite kiemo plotą kvadratiniais metrais").
- "field": labai trumpa to dalyko žyma, tinkanti eilutės pradžiai (1–3 žodžiai, pvz. „Plotas (m²)", „Darbų terminas", „Medžiagos").
Neklausk to, kas jau parašyta. Jei aprašymas jau išsamus — grąžink tuščią sąrašą [].

Grąžink TIK JSON, be jokio papildomo teksto.`;

export class AiImproveError extends Error {}

export interface ImproveRecommendation {
  prompt: string;
  field: string;
}

export interface ImproveDescriptionResult {
  improvedDescription: string;
  title: string;
  category: string;
  location: string;
  recommendations: ImproveRecommendation[];
}

function parseResult(raw: string): ImproveDescriptionResult | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;

  const improvedDescription =
    typeof record.improvedDescription === "string" ? record.improvedDescription.trim() : "";
  if (!improvedDescription) return null;

  const title = typeof record.title === "string" ? record.title.trim().slice(0, 90) : "";

  const rawCategory = (typeof record.category === "string" ? record.category.trim() : "").toLowerCase();
  const category = CATEGORY_VALUES.has(rawCategory) ? rawCategory : "";

  const rawLocation = typeof record.location === "string" ? record.location.trim() : "";
  const location = CITY_BY_LOWER.get(rawLocation.toLowerCase()) ?? "";

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

  return { improvedDescription, title, category, location, recommendations };
}

export async function improveDescription(
  input: ImproveDescriptionInput,
): Promise<ImproveDescriptionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AiImproveError("AI_NOT_CONFIGURED");
  }

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
          { role: "system", content: SYSTEM_PROMPT },
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

    const result = parseResult(raw);
    if (!result) {
      throw new AiImproveError("AI_EMPTY_RESPONSE");
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
