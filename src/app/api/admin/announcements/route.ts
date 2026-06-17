import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isAnnouncementAudience,
  isAnnouncementIcon,
} from "@/lib/announcement-shared";

/** Admin CRUD for announcement cards shown on tiekėjo / kliento dashboards. */

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return !!session?.user?.id && session.user.role === "ADMIN";
}

/** "" | "2026-06-20" | ISO -> Date | null. Returns undefined on an invalid value. */
function parseDate(value: unknown): Date | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET() {
  await connection();
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const cards = await prisma.announcementCard.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ success: true, data: cards });
  } catch (error) {
    console.error("Admin announcements GET error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await connection();
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ success: false, error: "Antraštė privaloma" }, { status: 400 });
    }
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      return NextResponse.json({ success: false, error: "Tekstas privalomas" }, { status: 400 });
    }
    const audience = isAnnouncementAudience(body.audience) ? body.audience : "PROVIDER";
    const icon = isAnnouncementIcon(body.icon) ? body.icon : "lightbulb";
    const startsAt = parseDate(body.startsAt);
    const endsAt = parseDate(body.endsAt);
    if (startsAt === undefined || endsAt === undefined) {
      return NextResponse.json({ success: false, error: "Neteisinga data" }, { status: 400 });
    }
    const sortOrder = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

    const card = await prisma.announcementCard.create({
      data: {
        title,
        body: text,
        ctaLabel: typeof body.ctaLabel === "string" && body.ctaLabel.trim() ? body.ctaLabel.trim() : null,
        ctaHref: typeof body.ctaHref === "string" && body.ctaHref.trim() ? body.ctaHref.trim() : null,
        icon,
        audience,
        isActive: body.isActive === true,
        sortOrder,
        startsAt,
        endsAt,
      },
    });
    return NextResponse.json({ success: true, data: card });
  } catch (error) {
    console.error("Admin announcements POST error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  await connection();
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ success: false, error: "Nenurodyta kortelė" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) {
        return NextResponse.json({ success: false, error: "Antraštė privaloma" }, { status: 400 });
      }
      data.title = title;
    }
    if (body.body !== undefined) {
      const text = String(body.body).trim();
      if (!text) {
        return NextResponse.json({ success: false, error: "Tekstas privalomas" }, { status: 400 });
      }
      data.body = text;
    }
    if (body.audience !== undefined) {
      if (!isAnnouncementAudience(body.audience)) {
        return NextResponse.json({ success: false, error: "Neteisinga auditorija" }, { status: 400 });
      }
      data.audience = body.audience;
    }
    if (body.icon !== undefined) {
      if (!isAnnouncementIcon(body.icon)) {
        return NextResponse.json({ success: false, error: "Neteisinga ikona" }, { status: 400 });
      }
      data.icon = body.icon;
    }
    if (body.ctaLabel !== undefined) {
      data.ctaLabel = String(body.ctaLabel).trim() || null;
    }
    if (body.ctaHref !== undefined) {
      data.ctaHref = String(body.ctaHref).trim() || null;
    }
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (body.sortOrder !== undefined && Number.isInteger(Number(body.sortOrder))) {
      data.sortOrder = Number(body.sortOrder);
    }
    if (body.startsAt !== undefined) {
      const startsAt = parseDate(body.startsAt);
      if (startsAt === undefined) {
        return NextResponse.json({ success: false, error: "Neteisinga pradžios data" }, { status: 400 });
      }
      data.startsAt = startsAt;
    }
    if (body.endsAt !== undefined) {
      const endsAt = parseDate(body.endsAt);
      if (endsAt === undefined) {
        return NextResponse.json({ success: false, error: "Neteisinga pabaigos data" }, { status: 400 });
      }
      data.endsAt = endsAt;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "Nėra ką atnaujinti" }, { status: 400 });
    }

    const card = await prisma.announcementCard.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: card });
  } catch (error) {
    console.error("Admin announcements PUT error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await connection();
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!id) {
      return NextResponse.json({ success: false, error: "Nenurodyta kortelė" }, { status: 400 });
    }
    await prisma.announcementCard.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin announcements DELETE error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
