import { prisma } from "@/lib/prisma";

export interface ModerationLogEntry {
  entityType: string;
  entityId?: string | null;
  verdict: string;
  source: string;
  categories?: string[];
  reason?: string | null;
  matchedTerms?: string[];
  textSample?: string | null;
  model?: string | null;
  latencyMs?: number | null;
  actorUserId?: string | null;
}

/**
 * Įrašo moderacijos sprendimą į auditą. NIEKADA nemeta klaidos — jei įrašymas
 * nepavyksta, tai neturi paveikti vartotojo kelio.
 */
export async function writeModerationLog(entry: ModerationLogEntry): Promise<void> {
  try {
    await prisma.moderationLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        verdict: entry.verdict,
        source: entry.source,
        categories: entry.categories ?? [],
        reason: entry.reason ?? null,
        matchedTerms: entry.matchedTerms ?? [],
        textSample: entry.textSample ?? null,
        model: entry.model ?? null,
        latencyMs: entry.latencyMs ?? null,
        actorUserId: entry.actorUserId ?? null,
      },
    });
  } catch (err) {
    console.error("writeModerationLog nepavyko:", err);
  }
}
