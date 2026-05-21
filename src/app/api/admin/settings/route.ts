import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getEmailDeliverySettings,
  isStoryEnabled,
  setEmailDeliverySettings,
  setStoryEnabled,
} from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function loadSettings() {
  const storyEnabled = await isStoryEnabled();
  const { emailTestMode, emailAllowlist } = await getEmailDeliverySettings();
  return { storyEnabled, emailTestMode, emailAllowlist };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: await loadSettings() });
  } catch (error) {
    console.error("Admin settings GET error:", error);
    const message = error instanceof Error ? error.message : "Klaida";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (typeof body.storyEnabled === "boolean") {
      await setStoryEnabled(body.storyEnabled);
    }

    const emailPatch: { emailTestMode?: boolean; emailAllowlist?: string[] } = {};

    if (typeof body.emailTestMode === "boolean") {
      emailPatch.emailTestMode = body.emailTestMode;
    }

    if (Array.isArray(body.emailAllowlist)) {
      const normalized = Array.from(
        new Set(
          (body.emailAllowlist as unknown[])
            .filter((e): e is string => typeof e === "string")
            .map((e) => e.trim().toLowerCase())
            .filter((e) => e.length > 0),
        ),
      );
      const invalid = normalized.filter((e) => !EMAIL_RE.test(e));
      if (invalid.length > 0) {
        return NextResponse.json(
          { success: false, error: `Netaisyklingi el. pašto adresai: ${invalid.join(", ")}` },
          { status: 400 },
        );
      }
      emailPatch.emailAllowlist = normalized;
    }

    if (Object.keys(emailPatch).length > 0) {
      await setEmailDeliverySettings(emailPatch);
    }

    return NextResponse.json({ success: true, data: await loadSettings() });
  } catch (error) {
    console.error("Admin settings PUT error:", error);
    const message = error instanceof Error ? error.message : "Klaida";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
