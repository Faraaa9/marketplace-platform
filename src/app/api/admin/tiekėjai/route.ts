import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, providerActivatedEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const providers = await prisma.user.findMany({
      where: {
        role: "PROVIDER",
        ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
      },
      include: {
        providerProfile: true,
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = providers.map((p) => ({
      ...p,
      providerProfile: p.providerProfile ? {
        ...p.providerProfile,
        specializations: JSON.parse(p.providerProfile.specializations || "[]"),
      } : null,
    }));

    return NextResponse.json({ success: true, data });
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

    const { userId, action } = await req.json();
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
              link: "/tiekėjas",
            },
          });
        }
      }
    }

    if (action === "delete") {
      await prisma.user.delete({ where: { id: userId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin provider action error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
