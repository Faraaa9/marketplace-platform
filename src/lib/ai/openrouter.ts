/**
 * Bendras OpenRouter klientas. Visi AI touchpoint'ai siunčia kvietimus per šią
 * vieną vietą, kad headeriai, timeout, retry, atsakymo parsinimas ir `usage`
 * (token'ų skaičius) ištraukimas būtų vienodi ir taisomi vienoje vietoje.
 *
 * Transport-only: čia NIEKO neloginama į ai_runs ir nemetama verslo klaidų.
 * Grąžinamas normalizuotas rezultatas su `ok` / `errorKind`; kiekvienas
 * kviečiantis modulis pats nusprendžia, ką daryti (mesti savo klaidą ar grįžti
 * į fallback). Modelį parenka kviečiantysis (resolveModel) ir perduoda čia, o
 * klientas jį grąžina atgal — kad auditas logintų REALIAI naudotą modelį.
 *
 * Server-only.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TITLE = "paslaugurinka.lt";

export interface OpenRouterUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

/** Transporto lygio nesėkmės priežastis (ne verslo logika). */
export type OpenRouterErrorKind = "timeout" | "http" | "network";

export interface OpenRouterResult {
  /** true kai gautas HTTP 2xx (turinys gali būti null — tikrina kviečiantysis). */
  ok: boolean;
  status: number;
  /** choices[0].message.content kai tai netuščias string; kitu atveju null. */
  content: string | null;
  /** Pilnas parsintas JSON atsakymas — reikalingas pvz. nuotraukų generavimui (images[]). */
  raw: unknown;
  usage: OpenRouterUsage | null;
  /** Modelis, kurį realiai siuntėme (kviečiančiojo resolveModel rezultatas). */
  model: string;
  latencyMs: number;
  attempts: number;
  errorKind?: OpenRouterErrorKind;
}

export interface OpenRouterCallOptions {
  apiKey: string;
  /** Jau išspręstas modelis (resolveModel rezultatas). */
  model: string;
  messages: unknown[];
  timeoutMs: number;
  temperature?: number;
  maxTokens?: number;
  /** Pridėti response_format: { type: "json_object" }. */
  jsonObject?: boolean;
  /** Pridėti reasoning: { enabled }. Jei nenurodyta — laukas neįterpiamas. */
  reasoning?: boolean;
  /** Pvz. ["image", "text"] nuotraukų generavimui. */
  modalities?: string[];
  /** X-Title header reikšmė. */
  title?: string;
  /**
   * Transient klaidų (HTTP 5xx/429, tinklas) pakartojimų skaičius. Numatyta 1.
   * Timeout NĖRA kartojamas — jis jau sunaudojo visą laiko biudžetą.
   */
  retries?: number;
  /** Papildomi body laukai (retas atvejis). */
  extraBody?: Record<string, unknown>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseUsage(raw: unknown): OpenRouterUsage | null {
  if (!raw || typeof raw !== "object") return null;
  const usage = (raw as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return null;
  const rec = usage as Record<string, unknown>;
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    promptTokens: num(rec.prompt_tokens),
    completionTokens: num(rec.completion_tokens),
    totalTokens: num(rec.total_tokens),
  };
}

function extractContent(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const choices = (raw as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: unknown })?.message;
  const content = (message as { content?: unknown })?.content;
  // Grąžinam string'ą net jei tuščias — kai kuriems kvietėjams (transkripcija
  // tylos atveju) "" yra galiojantis rezultatas; null reiškia trūkstamą lauką.
  return typeof content === "string" ? content : null;
}

function buildBody(opts: OpenRouterCallOptions): string {
  const body: Record<string, unknown> = { model: opts.model, messages: opts.messages };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.maxTokens !== undefined) body.max_tokens = opts.maxTokens;
  if (opts.jsonObject) body.response_format = { type: "json_object" };
  if (opts.reasoning !== undefined) body.reasoning = { enabled: opts.reasoning };
  if (opts.modalities) body.modalities = opts.modalities;
  if (opts.extraBody) Object.assign(body, opts.extraBody);
  return JSON.stringify(body);
}

function fail(
  opts: OpenRouterCallOptions,
  errorKind: OpenRouterErrorKind,
  status: number,
  startedAt: number,
  attempts: number,
): OpenRouterResult {
  return {
    ok: false,
    status,
    content: null,
    raw: null,
    usage: null,
    model: opts.model,
    latencyMs: Date.now() - startedAt,
    attempts,
    errorKind,
  };
}

/**
 * Vienas OpenRouter chat/completions kvietimas su timeout ir transient-retry.
 * Niekada nemeta — grąžina normalizuotą rezultatą.
 */
export async function callOpenRouter(opts: OpenRouterCallOptions): Promise<OpenRouterResult> {
  const retries = opts.retries ?? 1;
  const body = buildBody(opts);
  const startedAt = Date.now();
  let attempts = 0;
  let lastStatus = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    attempts = attempt + 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          "Content-Type": "application/json",
          "X-Title": opts.title ?? DEFAULT_TITLE,
        },
        body,
        signal: controller.signal,
      });
      lastStatus = res.status;

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("OpenRouter klaida:", res.status, detail.slice(0, 500));
        if ((res.status >= 500 || res.status === 429) && attempt < retries) {
          await delay(300 * (attempt + 1));
          continue;
        }
        return fail(opts, "http", res.status, startedAt, attempts);
      }

      const raw = (await res.json().catch(() => null)) as unknown;
      return {
        ok: true,
        status: res.status,
        content: extractContent(raw),
        raw,
        usage: parseUsage(raw),
        model: opts.model,
        latencyMs: Date.now() - startedAt,
        attempts,
      };
    } catch (err) {
      const name = (err as { name?: string } | null)?.name;
      if (name === "AbortError") {
        return fail(opts, "timeout", lastStatus, startedAt, attempts);
      }
      if (attempt < retries) {
        await delay(300 * (attempt + 1));
        continue;
      }
      console.error("OpenRouter tinklo klaida:", err);
      return fail(opts, "network", lastStatus, startedAt, attempts);
    } finally {
      clearTimeout(timer);
    }
  }

  return fail(opts, "network", lastStatus, startedAt, attempts);
}
