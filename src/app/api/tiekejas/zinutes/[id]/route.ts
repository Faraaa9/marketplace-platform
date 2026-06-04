import { after, NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { formatLastSeen, getPresenceLevel } from "@/lib/presence";
import { createServerTimer } from "@/lib/server-timing";

/**
 * GET — fetch one direct-inquiry conversation (provider view) and mark it read.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const timer = createServerTimer("provider-thread-get");
  try {
    const { id } = await params;
    const guard = await requireActiveProvider();
    timer.mark("guard");
    if (!guard.authorized) return guard.response;

    if (id.startsWith("response-")) {
      const responseId = id.replace(/^response-/, "");
      const response = await prisma.response.findFirst({
        where: { id: responseId, providerId: guard.userId },
        select: {
          id: true,
          message: true,
          createdAt: true,
          clientLastReadAt: true,
          provider: { select: { id: true, name: true } },
          messages: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              senderId: true,
              senderName: true,
              sender: { select: { id: true, name: true, image: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          request: {
            select: {
              title: true,
              description: true,
              category: true,
              location: true,
              budget: true,
              deadline: true,
              createdAt: true,
              attachmentUrls: true,
              clientName: true,
              client: { select: { image: true, lastSeenAt: true } },
              categoryRef: { select: { name: true } },
              categories: { select: { category: { select: { name: true } } } },
              _count: { select: { responses: true } },
              status: true,
            },
          },
        },
      });
      timer.mark("responseQuery");

      if (!response) {
        return NextResponse.json({ success: false, error: "Pokalbis nerastas" }, { status: 404 });
      }

      after(() =>
        prisma.response
          .update({
            where: { id: response.id },
            data: { providerLastReadAt: new Date() },
            select: { id: true },
          })
          .catch(() => null)
      );

      const categoryNames = response.request.categories.map((c) => c.category.name);
      timer.mark("map");
      timer.end({ mode: "response", messages: response.messages.length });
      return NextResponse.json({
        success: true,
        data: {
          type: "response",
          id: response.id,
          providerId: response.provider.id,
          title: response.request.title,
          subtitle: response.request.clientName,
          status: response.request.status,
          otherParticipantName: response.request.clientName,
          otherParticipantImage: response.request.client?.image ?? null,
          otherParticipantPresenceLevel: getPresenceLevel(response.request.client?.lastSeenAt),
          otherParticipantPresenceLabel: formatLastSeen(response.request.client?.lastSeenAt),
          otherParticipantReadAt: response.clientLastReadAt?.toISOString() ?? null,
          initialMessages: [
            {
              id: `response-${response.id}`,
              content: response.message,
              createdAt: response.createdAt.toISOString(),
              senderId: response.provider.id,
              senderName: response.provider.name,
              sender: { id: response.provider.id, name: response.provider.name ?? "", image: null },
              status: "sent",
            },
            ...response.messages.map((m) => ({
              id: m.id,
              content: m.content,
              createdAt: m.createdAt.toISOString(),
              senderId: m.senderId,
              senderName: m.senderName ?? m.sender?.name ?? null,
              sender: m.sender,
              status: "sent",
            })),
          ],
          requestBrief: {
            title: response.request.title,
            description: response.request.description,
            categoryLabel: categoryNames[0] || response.request.categoryRef?.name || response.request.category,
            location: response.request.location,
            budget: response.request.budget,
            deadline: response.request.deadline,
            createdAt: response.request.createdAt.toISOString(),
            responseCount: response.request._count.responses,
            attachmentCount: response.request.attachmentUrls.length,
          },
        },
      });
    }

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
        sender: { select: { image: true, name: true, lastSeenAt: true } },
        status: true,
        createdAt: true,
        clientLastReadAt: true,
        messages: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            senderName: true,
            sender: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    timer.mark("directQuery");

    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Žinutė nerasta" }, { status: 404 });
    }

    after(() =>
      prisma.directInquiry
        .update({
          where: { id },
          data: { providerLastReadAt: new Date() },
          select: { id: true },
        })
        .catch(() => null)
    );

    const { sender, ...data } = inquiry;
    timer.mark("map");
    timer.end({ mode: "direct", messages: inquiry.messages.length });

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        type: "direct",
        title: inquiry.senderName?.trim() || inquiry.senderEmail,
        subtitle: inquiry.senderEmail,
        senderImage: sender?.image ?? null,
        senderAccountName: sender?.name ?? null,
        senderPresenceLevel: getPresenceLevel(sender?.lastSeenAt),
        senderPresenceLabel: formatLastSeen(sender?.lastSeenAt),
      },
    });
  } catch (error) {
    console.error("Get inquiry error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

/**
 * PATCH — archive / un-archive an inquiry (status: ARCHIVED or READ).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
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
