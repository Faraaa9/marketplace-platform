import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isStoryEnabled, setStoryEnabled } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const storyEnabled = await isStoryEnabled();
    return NextResponse.json({ success: true, data: { storyEnabled } });
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

    const storyEnabled = await isStoryEnabled();
    return NextResponse.json({ success: true, data: { storyEnabled } });
  } catch (error) {
    console.error("Admin settings PUT error:", error);
    const message = error instanceof Error ? error.message : "Klaida";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
