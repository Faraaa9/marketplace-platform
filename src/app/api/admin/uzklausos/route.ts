import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const category = searchParams.get("category") || "";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const requests = await prisma.serviceRequest.findMany({
      where,
      include: { _count: { select: { responses: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error("Admin requests error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id, action, status } = await req.json();

    if (action === "delete") {
      await prisma.serviceRequest.delete({ where: { id } });
    } else if (action === "updateStatus" && status) {
      await prisma.serviceRequest.update({ where: { id }, data: { status } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin request action error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
