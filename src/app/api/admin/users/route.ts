import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ROLES = ["CLIENT", "PROVIDER", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "";
    const statusFilter = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(ROLES.includes(roleFilter as Role) ? { role: roleFilter } : {}),
      ...(statusFilter === "blocked" ? { blocked: true } : {}),
      ...(statusFilter === "active" ? { blocked: false } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          blocked: true,
          blockedAt: true,
          adminNote: true,
          phone: true,
          emailVerified: true,
          createdAt: true,
          lastSeenAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { userId, action, role, note } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ success: false, error: "Trūksta duomenų" }, { status: 400 });
    }

    // An admin must not lock themselves out: no self-block, self-delete, or self-demote.
    const isSelf = userId === session.user.id;
    if (isSelf && (action === "block" || action === "delete" || action === "change-role")) {
      return NextResponse.json(
        { success: false, error: "Negalite atlikti šio veiksmo savo paskyrai" },
        { status: 400 },
      );
    }

    switch (action) {
      case "block":
        await prisma.user.update({
          where: { id: userId },
          data: { blocked: true, blockedAt: new Date() },
        });
        break;

      case "unblock":
        await prisma.user.update({
          where: { id: userId },
          data: { blocked: false, blockedAt: null },
        });
        break;

      case "change-role": {
        if (!ROLES.includes(role)) {
          return NextResponse.json({ success: false, error: "Netinkama rolė" }, { status: 400 });
        }
        await prisma.user.update({ where: { id: userId }, data: { role } });
        break;
      }

      case "set-note":
        await prisma.user.update({
          where: { id: userId },
          data: { adminNote: typeof note === "string" && note.trim() ? note.trim() : null },
        });
        break;

      case "delete":
        await prisma.user.delete({ where: { id: userId } });
        break;

      default:
        return NextResponse.json({ success: false, error: "Nežinomas veiksmas" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin user action error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
