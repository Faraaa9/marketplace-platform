import { categorizeMultilabel } from "@/lib/category-multilabel";
import { suggestCategories } from "@/lib/category-suggestions";
import { isCategorizationV2Enabled } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

/**
 * Two-layer category recognition.
 *  PRIMARY  = the prototype engine (categorizeMultilabel: segment -> embed ->
 *             pgvector k50 -> LLM rerank), capped at PROTO_TIMEOUT_MS.
 *  FALLBACK = deterministic suggestCategories (skipAi -> instant).
 * ANY primary failure (timeout / API error incl. 402 / empty / exception)
 * silently falls to the fallback — the user always sees a result, never an error.
 * `categorizationV2Enabled` is the kill switch: OFF -> everything goes through the
 * fallback. Every request logs which layer answered (category_recognition_log).
 */
const PROTO_TIMEOUT_MS = 6_000;
const MAX = 3;

export interface RecognizedCategory {
  id: string;
  name: string;
}
export interface RecognitionResult {
  categories: RecognizedCategory[];
  source: "prototype" | "fallback";
  /** why the fallback fired: flag_off | forced | timeout | null | empty | exception */
  errorKind?: string;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function fallbackLayer(text: string): Promise<RecognizedCategory[]> {
  const res = await suggestCategories({ mode: "request", text, limit: MAX + 2, skipAi: true });
  return res.suggestions.slice(0, MAX).map((s) => ({ id: s.id, name: s.name }));
}

function logLayer(source: string, errorKind: string | null, latencyMs: number): void {
  // fire-and-forget; logging must NEVER affect the request flow
  void prisma.$executeRaw`
    insert into category_recognition_log (source, error_kind, latency_ms)
    values (${source}, ${errorKind ?? null}, ${latencyMs})
  `.catch(() => {});
}

export async function recognizeCategories(text: string): Promise<RecognitionResult> {
  const t0 = Date.now();

  const enabled = await isCategorizationV2Enabled();
  const forced = process.env.CATEGORIZATION_FORCE_FALLBACK === "1"; // test hook
  if (!enabled || forced) {
    const categories = await fallbackLayer(text);
    const kind = forced ? "forced" : "flag_off";
    logLayer("fallback", kind, Date.now() - t0);
    return { categories, source: "fallback", errorKind: kind };
  }

  try {
    const jobs = await withTimeout(categorizeMultilabel(text, { v2: true }), PROTO_TIMEOUT_MS);
    if (!jobs) throw new Error("null"); // categorizeMultilabel swallows API/402/etc. -> null
    const seen = new Set<string>();
    const categories: RecognizedCategory[] = [];
    for (const j of jobs) {
      for (const s of j.suggestions) {
        if (s.auto && !seen.has(s.categoryId)) {
          seen.add(s.categoryId);
          categories.push({ id: s.categoryId, name: s.name });
        }
      }
    }
    if (categories.length === 0) throw new Error("empty");
    logLayer("prototype", null, Date.now() - t0);
    return { categories: categories.slice(0, MAX), source: "prototype" };
  } catch (e) {
    const msg = (e as Error).message;
    const kind = msg === "timeout" || msg === "null" || msg === "empty" ? msg : "exception";
    const categories = await fallbackLayer(text);
    logLayer("fallback", kind, Date.now() - t0);
    return { categories, source: "fallback", errorKind: kind };
  }
}
