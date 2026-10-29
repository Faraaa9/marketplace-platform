import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimitAsync } from "@/lib/rate-limit";
import { MULTILABEL_LOG_MAX_EVENTS, MULTILABEL_LOG_RATE_LIMIT, multilabelLogRateKey } from "../limits";

// Logs user actions on multi-label suggestions into category_suggestion_event
// (training data for a future auto-assign). Best-effort: a logging failure must
// NEVER break the request-create flow.

const ACTIONS = new Set(["accepted", "rejected", "added_manual"]);
const SEG_MODEL = "google/gemini-2.5-flash";
const EMB_MODEL = "openai/text-embedding-3-large";
const RERANK_MODEL = "google/gemini-2.5-flash";
const MAX_PHRASE = 300;
const MAX_ID = 64;

interface Ev {
  requestId: string | null;
  jobPhrase: string;
  suggestedCategoryId: string | null;
  suggestedRank: number | null;
  action: string;
  chosenCategoryId: string | null;
}

const optId = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= MAX_ID ? v : null);

// Unknown shapes are dropped rather than coerced: this table is training data,
// junk rows would poison it.
function parseEvent(raw: unknown): Ev | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.jobPhrase !== "string" || e.jobPhrase.length > MAX_PHRASE) return null;
  if (typeof e.action !== "string" || !ACTIONS.has(e.action)) return null;
  const rank = e.suggestedRank;
  return {
    requestId: optId(e.requestId),
    jobPhrase: e.jobPhrase,
    suggestedCategoryId: optId(e.suggestedCategoryId),
    suggestedRank: Number.isInteger(rank) && (rank as number) >= 0 && (rank as number) < 100 ? (rank as number) : null,
    action: e.action,
    chosenCategoryId: optId(e.chosenCategoryId),
  };
}

export async function POST(req: Request) {
  try {
    const rl = await rateLimitAsync(multilabelLogRateKey(getClientIp(req)), MULTILABEL_LOG_RATE_LIMIT);
    if (!rl.success) return NextResponse.json({ logged: 0 }, { status: 429 });
    const body = (await req.json().catch(() => ({}))) as { events?: unknown };
    const raw = Array.isArray(body.events) ? body.events.slice(0, MULTILABEL_LOG_MAX_EVENTS) : [];
    const events = raw.map(parseEvent).filter((e): e is Ev => e !== null);
    for (const e of events) {
      await prisma.$executeRaw`
        insert into category_suggestion_event
          (request_id, job_phrase, suggested_category_id, suggested_rank, action,
           chosen_category_id, seg_model, emb_model, rerank_model)
        values
          (${e.requestId}, ${e.jobPhrase}, ${e.suggestedCategoryId},
           ${e.suggestedRank}, ${e.action}, ${e.chosenCategoryId},
           ${SEG_MODEL}, ${EMB_MODEL}, ${RERANK_MODEL})
      `;
    }
    return NextResponse.json({ logged: events.length });
  } catch {
    return NextResponse.json({ logged: 0 });
  }
}
