import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, providerActivatedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const VALID_PLAN_TYPES = ["FREE", "BASIC", "PRO"];

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
          providerProfile: true,
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

    const { userId, action, planType } = await req.json();
    if (!userId || !action) {
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

    if (action === "set-plan") {
      if (!VALID_PLAN_TYPES.includes(planType)) {
        return NextResponse.json({ success: false, error: "Netinkamas plano tipas" }, { status: 400 });
      }

      // The effective plan resolves to FREE unless a Subscription is ACTIVE
      // (see getEffectivePlanType), so a manual grant must move both records.
      if (planType === "FREE") {
        await prisma.$transaction([
          prisma.providerProfile.update({ where: { userId }, data: { planType: "FREE" } }),
          prisma.subscription.updateMany({ where: { userId }, data: { status: "CANCELED" } }),
        ]);
      } else {
        await prisma.$transaction([
          prisma.providerProfile.update({ where: { userId }, data: { planType } }),
          prisma.subscription.upsert({
            where: { userId },
            update: { planType, status: "ACTIVE" },
            create: { userId, planType, status: "ACTIVE" },
          }),
        ]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin provider action error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
