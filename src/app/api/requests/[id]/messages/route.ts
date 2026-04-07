import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validations";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: (parsed.error.issues?.[0]?.message || "Validacijos klaida") }, { status: 400 });
    }

    // params.id here is the response ID (thread)
    const response = await prisma.response.findUnique({ where: { id: params.id } });
    if (!response) {
      return NextResponse.json({ success: false, error: "Atsakymas nerastas" }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        responseId: params.id,
        senderId: session.user.id,
        content: parsed.data.content,
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ success: false, error: "Klaida siunčiant žinutę" }, { status: 500 });
  }
}
