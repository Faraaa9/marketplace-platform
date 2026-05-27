import { prisma } from "@/lib/prisma";

export type AiRunStatus = "success" | "error";

export interface AiRunAuditInput {
  feature: string;
  status: AiRunStatus;
  provider?: string;
  model?: string;
  promptVersion?: string;
  latencyMs?: number;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

function safeStringify(value: Record<string, unknown> | undefined): string | null {
  if (!value) return null;
  try {
    return JSON.stringify(value).slice(0, 4000);
  } catch {
    return null;
  }
}

/**
 * Best-effort AI audit logging. Never throw from here: AI feature UX should
 * not fail because an observability write had a transient DB issue.
 */
export async function recordAiRun(input: AiRunAuditInput): Promise<void> {
  try {
    await prisma.aiRun.create({
      data: {
        feature: input.feature,
        status: input.status,
        provider: input.provider ?? null,
        model: input.model ?? null,
        promptVersion: input.promptVersion ?? null,
        latencyMs: input.latencyMs ?? null,
        actorUserId: input.actorUserId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        errorCode: input.errorCode ?? null,
        metadataJson: safeStringify(input.metadata),
      },
      select: { id: true },
    });
  } catch (error) {
    console.error("AI audit log failed:", error);
  }
}
