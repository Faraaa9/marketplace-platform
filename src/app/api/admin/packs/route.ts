import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Admin CRUD for credit packs — the buyable credit bundles + their prices. */

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return !!session?.user?.id && session.user.role === "ADMIN";
}

function parsePositiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET() {
  await connection();
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const packs = await prisma.creditPack.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        credits: true,
        priceCents: true,
        currency: true,
        isActive: true,
        sortOrder: true,
      },
    });
    return NextResponse.json({ success: true, data: packs });
  } catch (error) {
    console.error("Admin packs GET error:", error);
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

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ success: false, error: "Pavadinimas privalomas" }, { status: 400 });
    }
    const credits = parsePositiveInt(body.credits);
    if (credits === null) {
      return NextResponse.json(
        { success: false, error: "Kreditų skaičius turi būti teigiamas" },
        { status: 400 },
      );
    }
    const priceCents = parsePositiveInt(body.priceCents);
    if (priceCents === null) {
      return NextResponse.json({ success: false, error: "Kaina turi būti teigiama" }, { status: 400 });
    }
    const sortOrder = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

    const pack = await prisma.creditPack.create({
      data: { name, credits, priceCents, sortOrder },
    });
    return NextResponse.json({ success: true, data: pack });
  } catch (error) {
    console.error("Admin packs POST error:", error);
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
      return NextResponse.json({ success: false, error: "Nenurodytas paketas" }, { status: 400 });
    }

    const data: { name?: string; credits?: number; priceCents?: number; isActive?: boolean; sortOrder?: number } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ success: false, error: "Pavadinimas privalomas" }, { status: 400 });
      }
      data.name = name;
    }
    if (body.credits !== undefined) {
      const credits = parsePositiveInt(body.credits);
      if (credits === null) {
        return NextResponse.json(
          { success: false, error: "Kreditų skaičius turi būti teigiamas" },
          { status: 400 },
        );
      }
      data.credits = credits;
    }
    if (body.priceCents !== undefined) {
      const priceCents = parsePositiveInt(body.priceCents);
      if (priceCents === null) {
        return NextResponse.json({ success: false, error: "Kaina turi būti teigiama" }, { status: 400 });
      }
      data.priceCents = priceCents;
    }
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (body.sortOrder !== undefined && Number.isInteger(Number(body.sortOrder))) {
      data.sortOrder = Number(body.sortOrder);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "Nėra ką atnaujinti" }, { status: 400 });
    }

    const pack = await prisma.creditPack.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: pack });
  } catch (error) {
    console.error("Admin packs PUT error:", error);
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
      return NextResponse.json({ success: false, error: "Nenurodytas paketas" }, { status: 400 });
    }
    await prisma.creditPack.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin packs DELETE error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
