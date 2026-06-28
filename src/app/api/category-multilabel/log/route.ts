import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Logs user actions on multi-label suggestions into category_suggestion_event
// (training data for a future auto-assign). Best-effort: a logging failure must
// NEVER break the request-create flow.

const ACTIONS = new Set(["accepted", "rejected", "added_manual"]);
const SEG_MODEL = "google/gemini-2.5-flash";
const EMB_MODEL = "openai/text-embedding-3-large";
const RERANK_MODEL = "google/gemini-2.5-flash";

interface Ev {
  requestId?: string | null;
  jobPhrase: string;
  suggestedCategoryId?: string | null;
  suggestedRank?: number | null;
  action: string;
  chosenCategoryId?: string | null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { events?: Ev[] };
    const events = Array.isArray(body.events) ? body.events.slice(0, 50) : [];
    for (const e of events) {
      if (!e || typeof e.jobPhrase !== "string" || !ACTIONS.has(e.action)) continue;
      await prisma.$executeRaw`
        insert into category_suggestion_event
          (request_id, job_phrase, suggested_category_id, suggested_rank, action,
           chosen_category_id, seg_model, emb_model, rerank_model)
        values
          (${e.requestId ?? null}, ${e.jobPhrase}, ${e.suggestedCategoryId ?? null},
           ${e.suggestedRank ?? null}, ${e.action}, ${e.chosenCategoryId ?? null},
           ${SEG_MODEL}, ${EMB_MODEL}, ${RERANK_MODEL})
      `;
    }
    return NextResponse.json({ logged: events.length });
  } catch {
    return NextResponse.json({ logged: 0 });
  }
}
