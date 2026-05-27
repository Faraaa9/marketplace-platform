import { prisma } from "@/lib/prisma";

export type AiUsageStats = {
  total14d: number;
  success14d: number;
  error14d: number;
  avgLatencyMs: number | null;
  lastRunAt: string | null;
  byFeature: Array<{
    feature: string;
    total: number;
    errors: number;
    avgLatencyMs: number | null;
  }>;
  recentErrors: Array<{
    feature: string;
    errorCode: string | null;
    createdAt: string;
  }>;
};

const EMPTY: AiUsageStats = {
  total14d: 0,
  success14d: 0,
  error14d: 0,
  avgLatencyMs: null,
  lastRunAt: null,
  byFeature: [],
  recentErrors: [],
};

/**
 * Rolling AI health snapshot for the admin dashboard. Only operational
 * metadata is read from `ai_runs`; nothing here touches user content or
 * prompts. Errors fall through to an empty snapshot so the admin page never
 * fails because of an observability stat.
 */
export async function getAiUsageStats(since: Date): Promise<AiUsageStats> {
  try {
    const runs = await prisma.aiRun.findMany({
      where: { createdAt: { gte: since } },
      select: {
        feature: true,
        status: true,
        latencyMs: true,
        errorCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const byFeature = new Map<
      string,
      {
        feature: string;
        total: number;
        errors: number;
        latencyTotal: number;
        latencyCount: number;
      }
    >();
    let success14d = 0;
    let error14d = 0;
    let latencyTotal = 0;
    let latencyCount = 0;

    for (const run of runs) {
      if (run.status === "error") error14d += 1;
      else if (run.status === "success") success14d += 1;

      if (typeof run.latencyMs === "number") {
        latencyTotal += run.latencyMs;
        latencyCount += 1;
      }

      const current =
        byFeature.get(run.feature) ??
        { feature: run.feature, total: 0, errors: 0, latencyTotal: 0, latencyCount: 0 };
      current.total += 1;
      if (run.status === "error") current.errors += 1;
      if (typeof run.latencyMs === "number") {
        current.latencyTotal += run.latencyMs;
        current.latencyCount += 1;
      }
      byFeature.set(run.feature, current);
    }

    return {
      total14d: runs.length,
      success14d,
      error14d,
      avgLatencyMs: latencyCount > 0 ? Math.round(latencyTotal / latencyCount) : null,
      lastRunAt: runs[0]?.createdAt.toISOString() ?? null,
      byFeature: Array.from(byFeature.values())
        .map((feature) => ({
          feature: feature.feature,
          total: feature.total,
          errors: feature.errors,
          avgLatencyMs:
            feature.latencyCount > 0
              ? Math.round(feature.latencyTotal / feature.latencyCount)
              : null,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6),
      recentErrors: runs
        .filter((run) => run.status === "error")
        .slice(0, 5)
        .map((run) => ({
          feature: run.feature,
          errorCode: run.errorCode,
          createdAt: run.createdAt.toISOString(),
        })),
    };
  } catch (error) {
    console.error("Admin AI usage stats error:", error);
    return EMPTY;
  }
}
