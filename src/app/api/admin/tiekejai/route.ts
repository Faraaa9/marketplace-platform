import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, providerActivatedEmail } from "@/lib/email";
import { grantCredits } from "@/lib/credits";
import { creditsLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const statusFilter = searchParams.get("status") || "";

    const where: Record<string, unknown> = {
      role: "PROVIDER" as const,
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
    };
    if (statusFilter === "active") {
      where.providerProfile = { isActive: true };
    } else if (statusFilter === "inactive") {
      where.providerProfile = { isActive: false };
    }

    const [providers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          providerProfile: { include: { categories: { select: { category: { select: { name: true } } } } } },
          _count: { select: { responses: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const data = providers.map((p) => ({
      ...p,
      providerProfile: p.providerProfile ?? null,
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin providers error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { userId, action, credits, note, email } = await req.json();
    if (!action) {
      return NextResponse.json({ success: false, error: "Trūksta duomenų" }, { status: 400 });
    }
    // Every action except grant-credits targets a provider by table-row id;
    // grant-credits can instead resolve the recipient from a typed email.
    if (action !== "grant-credits" && !userId) {
      return NextResponse.json({ success: false, error: "Trūksta duomenų" }, { status: 400 });
    }

    if (action === "activate" || action === "deactivate") {
      const isActive = action === "activate";
      await prisma.providerProfile.update({
        where: { userId },
        data: { isActive },
      });

      if (isActive) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.email) {
          const emailData = providerActivatedEmail(user.name || "Tiekėjau");
          await sendEmail({ to: user.email, ...emailData });

          await prisma.notification.create({
            data: {
              userId,
              type: "ACCOUNT_ACTIVATED",
              title: "Paskyra aktyvuota",
              body: "Jūsų tiekėjo paskyra buvo aktyvuota. Galite pradėti atsakinėti į užklausas.",
              link: "/tiekejas",
            },
          });
        }
      }
    }

    if (action === "delete") {
      await prisma.user.delete({ where: { id: userId } });
    }

    if (action === "grant-credits") {
      const amount = Number(credits);
      if (!Number.isInteger(amount) || amount <= 0) {
        return NextResponse.json(
          { success: false, error: "Kreditų skaičius turi būti teigiamas" },
          { status: 400 },
        );
      }

      // The recipient is resolved either from a table-row userId or, when the
      // admin uses the "send credits by email" form, from the typed address.
      let recipientId: string;
      if (typeof userId === "string" && userId) {
        recipientId = userId;
      } else {
        const typedEmail = typeof email === "string" ? email.trim() : "";
        if (!typedEmail) {
          return NextResponse.json(
            { success: false, error: "Įveskite tiekėjo el. paštą" },
            { status: 400 },
          );
        }
        const match = await prisma.user.findFirst({
          where: { email: { equals: typedEmail, mode: "insensitive" } },
          select: { id: true },
        });
        if (!match) {
          return NextResponse.json(
            { success: false, error: "Vartotojas su tokiu el. paštu nerastas" },
            { status: 404 },
          );
        }
        recipientId = match.id;
      }

      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          providerProfile: { select: { id: true } },
        },
      });
      if (!recipient || recipient.role !== "PROVIDER" || !recipient.providerProfile) {
        return NextResponse.json(
          { success: false, error: "Šis el. paštas nepriklauso paslaugų tiekėjui" },
          { status: 400 },
        );
      }

      const result = await grantCredits({
        providerProfileId: recipient.providerProfile.id,
        amount,
        type: "ADMIN_GRANT",
        note:
          typeof note === "string" && note.trim()
            ? note.trim()
            : "Administratoriaus dovana",
        adminUserId: session.user.id,
      });
      await prisma.notification.create({
        data: {
          userId: recipient.id,
          type: "CREDITS_GRANTED",
          title: "Gavote kreditų",
          body: `Administratorius pridėjo ${amount} ${creditsLabel(amount)}. Jūsų balansas: ${result.balance}.`,
          link: "/tiekejas/planai",
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          providerName: recipient.name || recipient.email,
          email: recipient.email,
          granted: amount,
          balance: result.balance,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin provider action error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
