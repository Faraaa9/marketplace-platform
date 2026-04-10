import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";

/**
 * PATCH — update inquiry status (READ, ARCHIVED)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const body = await req.json();
    const newStatus = body.status;

    if (!["READ", "ARCHIVED"].includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: "Netinkamas statusas" },
        { status: 400 }
      );
    }

    // Verify ownership
    const inquiry = await prisma.directInquiry.findFirst({
      where: { id, providerId: guard.userId },
      select: { id: true },
    });

    if (!inquiry) {
      return NextResponse.json(
        { success: false, error: "Žinutė nerasta" },
        { status: 404 }
      );
    }

    const updated = await prisma.directInquiry.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, status: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update inquiry error:", error);
    return NextResponse.json(
      { success: false, error: "Klaida" },
      { status: 500 }
    );
  }
}
