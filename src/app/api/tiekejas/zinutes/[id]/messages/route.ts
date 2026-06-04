import { after, NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireActiveProvider } from "@/lib/provider-guard";
import { invalidateProviderInboxListCache } from "@/lib/provider-inbox-cache";
import { createMessageNotification } from "@/lib/message-notifications";
import { createServerTimer } from "@/lib/server-timing";

/**
 * Post a message to a direct-inquiry thread — provider side.
 * params.id = DirectInquiry id.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const timer = createServerTimer("provider-message-send");
  try {
    const { id } = await params;
    const guard = await requireActiveProvider(req);
    timer.mark("guard");
    if (!guard.authorized) return guard.response;

    const body = await req.json();
    timer.mark("parseBody");
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues?.[0]?.message || "Validacijos klaida" },
        { status: 400 }
      );
    }

    const inquiry = await prisma.directInquiry.findFirst({
      where: { id, providerId: guard.userId },
      select: { id: true, senderUserId: true, trackingToken: true },
    });
    timer.mark("inquiryLookup");
    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Žinutė nerasta" }, { status: 404 });
    }

    const sanitizedContent = sanitizeHtml(parsed.data.content);

    const providerName = guard.userName;

    // Persist the message and bump the thread's activity timestamp atomically.
    // The provider's own send also counts as "read".
    const now = new Date();
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          directInquiryId: id,
          senderId: guard.userId,
          senderName: providerName,
          content: sanitizedContent,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderName: true,
          sender: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.directInquiry.update({
        where: { id },
        data: { lastMessageAt: now, providerLastReadAt: now },
      }),
    ]);
    timer.mark("transaction");
    invalidateProviderInboxListCache(guard.userId);

    // Notify the sender — best-effort, in-app only when the sender has an account.
    if (inquiry.senderUserId) {
      const senderUserId = inquiry.senderUserId;
      after(() =>
        createMessageNotification({
          userId: senderUserId,
          link: `/paskyra/zinutes?thread=${inquiry.trackingToken}`,
          contextLabel: providerName || "Tiekėjas",
        })
      );
    }
    timer.end({ inquiryId: id, notified: Boolean(inquiry.senderUserId) });

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("Send direct-inquiry message error:", error);
    return NextResponse.json({ success: false, error: "Klaida siunčiant žinutę" }, { status: 500 });
  }
}
