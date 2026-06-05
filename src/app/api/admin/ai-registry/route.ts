import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { isDynamicServerError } from "next/dist/client/components/hooks-server-context";
import { authOptions } from "@/lib/auth";
import { AI_TOUCHPOINTS } from "@/lib/ai/registry";
import { AI_MODELS } from "@/lib/ai/prompt-config";
import { getAiFeatureUsage } from "@/lib/admin/ai-usage";
import { prisma } from "@/lib/prisma";

interface TouchpointConfigPayload {
  enabled: boolean;
  draftModel: string | null;
  draftPrompts: Record<string, string>;
  activeModel: string | null;
  activePrompts: Record<string, string>;
  activatedAt: string | null;
  updatedAt: string | null;
}

function parsePrompts(json: string | null): Record<string, string> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export async function GET() {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [usage, configRows] = await Promise.all([
      getAiFeatureUsage(thirtyDaysAgo),
      prisma.aiTouchpointConfig.findMany({
        select: {
          touchpointId: true,
          enabled: true,
          draftModel: true,
          draftPromptsJson: true,
          activeModel: true,
          activePromptsJson: true,
          activatedAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const configs: Record<string, TouchpointConfigPayload> = {};
    for (const row of configRows) {
      configs[row.touchpointId] = {
        draftModel: row.draftModel,
        enabled: row.enabled,
        draftPrompts: parsePrompts(row.draftPromptsJson),
        activeModel: row.activeModel,
        activePrompts: parsePrompts(row.activePromptsJson),
        activatedAt: row.activatedAt ? row.activatedAt.toISOString() : null,
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        windowDays: 30,
        touchpoints: AI_TOUCHPOINTS,
        usage,
        configs,
        models: AI_MODELS,
      },
    });
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error;
    }
    console.error("Admin AI registry error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
