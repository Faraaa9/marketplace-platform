import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { isDynamicServerError } from "next/dist/client/components/hooks-server-context";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AI_MODELS, PROMPT_DEFAULTS, invalidateAiConfigCache } from "@/lib/ai/prompt-config";
import { AI_TOUCHPOINTS } from "@/lib/ai/registry";

type Action = "save" | "activate" | "reset" | "toggle";

interface Body {
  touchpointId?: string;
  action?: Action;
  model?: string | null;
  prompts?: Record<string, unknown>;
  enabled?: boolean;
}

const VALID_MODEL_IDS = new Set(AI_MODELS.map((m) => m.id));
const VALID_TOUCHPOINT_IDS = new Set(AI_TOUCHPOINTS.map((touchpoint) => touchpoint.id));

/**
 * Sanitize an incoming model choice: must be one of the curated AI_MODELS, and
 * is stored as null when it equals the touchpoint's code default (so defaults
 * keep flowing through env/code). Returns { ok, value } or an error.
 */
function sanitizeModel(
  touchpointId: string,
  model: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (model == null || model === "") return { ok: true, value: null };
  if (!VALID_MODEL_IDS.has(model)) return { ok: false, error: "Nežinomas modelis" };
  const def = PROMPT_DEFAULTS[touchpointId];
  if (def && def.defaultModel === model) return { ok: true, value: null };
  return { ok: true, value: model };
}

/**
 * Keep only known prompt keys for this touchpoint, trimmed. Empty/whitespace or
 * default-equal text is dropped so the resolver falls back to the code default.
 */
function sanitizePrompts(
  touchpointId: string,
  prompts: Record<string, unknown> | undefined,
): Record<string, string> {
  const def = PROMPT_DEFAULTS[touchpointId];
  if (!def || !prompts) return {};
  const validKeys = new Map(def.prompts.map((p) => [p.key, p.template]));
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(prompts)) {
    if (!validKeys.has(key)) continue;
    if (typeof raw !== "string") continue;
    const text = raw.trim();
    if (!text) continue;
    if (text === (validKeys.get(key) ?? "").trim()) continue; // same as default
    out[key] = raw;
  }
  return out;
}

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const touchpointId = body?.touchpointId;
    const action = body?.action;

    if (!touchpointId || !VALID_TOUCHPOINT_IDS.has(touchpointId)) {
      return NextResponse.json({ success: false, error: "Nežinomas AI kelias" }, { status: 400 });
    }
    if (action !== "save" && action !== "activate" && action !== "reset" && action !== "toggle") {
      return NextResponse.json({ success: false, error: "Netinkamas veiksmas" }, { status: 400 });
    }

    if (action === "toggle") {
      if (typeof body?.enabled !== "boolean") {
        return NextResponse.json({ success: false, error: "Netinkama būsena" }, { status: 400 });
      }
      await prisma.aiTouchpointConfig.upsert({
        where: { touchpointId },
        create: {
          touchpointId,
          enabled: body.enabled,
          updatedBy: session.user.id,
        },
        update: {
          enabled: body.enabled,
          updatedBy: session.user.id,
        },
      });
      invalidateAiConfigCache();
      return NextResponse.json({ success: true, data: { enabled: body.enabled } });
    }

    if (action === "reset") {
      await prisma.aiTouchpointConfig.deleteMany({ where: { touchpointId } });
      invalidateAiConfigCache();
      return NextResponse.json({ success: true, data: { reset: true } });
    }

    if (!PROMPT_DEFAULTS[touchpointId]) {
      return NextResponse.json(
        { success: false, error: "Šis workflow neturi redaguojamo modelio ar prompto" },
        { status: 400 },
      );
    }

    const modelResult = sanitizeModel(touchpointId, body?.model);
    if (!modelResult.ok) {
      return NextResponse.json({ success: false, error: modelResult.error }, { status: 400 });
    }
    const model = modelResult.value;
    const prompts = sanitizePrompts(touchpointId, body?.prompts);
    const promptsJson = Object.keys(prompts).length > 0 ? JSON.stringify(prompts) : null;

    if (action === "save") {
      await prisma.aiTouchpointConfig.upsert({
        where: { touchpointId },
        create: {
          touchpointId,
          draftModel: model,
          draftPromptsJson: promptsJson,
          updatedBy: session.user.id,
        },
        update: {
          draftModel: model,
          draftPromptsJson: promptsJson,
          updatedBy: session.user.id,
        },
      });
      return NextResponse.json({ success: true, data: { saved: true } });
    }

    // activate: persist edits to draft AND promote to active (live in production).
    await prisma.aiTouchpointConfig.upsert({
      where: { touchpointId },
      create: {
        touchpointId,
        draftModel: model,
        draftPromptsJson: promptsJson,
        activeModel: model,
        activePromptsJson: promptsJson,
        activatedAt: new Date(),
        updatedBy: session.user.id,
      },
      update: {
        draftModel: model,
        draftPromptsJson: promptsJson,
        activeModel: model,
        activePromptsJson: promptsJson,
        activatedAt: new Date(),
        updatedBy: session.user.id,
      },
    });
    invalidateAiConfigCache();
    return NextResponse.json({ success: true, data: { activated: true } });
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error;
    }
    console.error("Admin AI config error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
