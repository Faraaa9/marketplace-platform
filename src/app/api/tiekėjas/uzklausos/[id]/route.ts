import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { responseSchema } from "@/lib/validations";
import { sendEmail, newResponseEmail } from "@/lib/email";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { id: params.id },
      include: {
        responses: {
          include: {
            provider: { select: { id: true, name: true } },
            messages: {
              include: { sender: { select: { id: true, name: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Nerasta" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: request });
  } catch (error) {
    console.error("Get request error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = responseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: (parsed.error.issues?.[0]?.message || "Validacijos klaida") }, { status: 400 });
    }

    // Check if already responded
    const existing = await prisma.response.findFirst({
      where: { requestId: params.id, providerId: session.user.id },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Jau atsakėte į šią užklausą" }, { status: 400 });
    }

    const request = await prisma.serviceRequest.findUnique({ where: { id: params.id } });
    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    const response = await prisma.response.create({
      data: {
        requestId: params.id,
        providerId: session.user.id,
        message: parsed.data.message,
        price: parsed.data.price || null,
      },
    });

    // Send email to client
    const emailData = newResponseEmail(request.clientName, request.title, request.id);
    await sendEmail({ to: request.clientEmail, ...emailData });

    // Create notification for client if they have account
    if (request.clientId) {
      await prisma.notification.create({
        data: {
          userId: request.clientId,
          type: "NEW_RESPONSE",
          title: "Naujas pasiūlymas",
          body: `Gavote pasiūlymą dėl „${request.title}"`,
          link: `/uzklausos/sekti/${request.id}`,
        },
      });
    }

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error("Create response error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
