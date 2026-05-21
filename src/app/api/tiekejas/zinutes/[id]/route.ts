import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";

/**
 * GET — fetch one direct-inquiry conversation (provider view) and mark it read.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const inquiry = await prisma.directInquiry.findFirst({
      where: { id, providerId: guard.userId },
      select: {
        id: true,
        providerId: true,
        description: true,
        budget: true,
        senderName: true,
        senderEmail: true,
        senderPhone: true,
        status: true,
        createdAt: true,
        messages: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            senderName: true,
            sender: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Žinutė nerasta" }, { status: 404 });
    }

    // Mark this conversation read — best-effort.
    try {
      await prisma.directInquiry.update({
        where: { id },
        data: { providerLastReadAt: new Date() },
      });
    } catch {
      // read tracking must never break the page
    }

    return NextResponse.json({ success: true, data: inquiry });
  } catch (error) {
    console.error("Get inquiry error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

/**
 * PATCH — archive / un-archive an inquiry (status: ARCHIVED or READ).
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
