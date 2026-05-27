import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const category = searchParams.get("category") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) {
      // `?category=` carries a curated category slug — resolve it to the id.
      const picked = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true },
      });
      // Unknown slug → match nothing rather than silently ignoring the filter.
      where.categoryId = picked ? picked.id : "__no_match__";
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { clientName: { contains: search, mode: "insensitive" } },
        { clientEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const [requests, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        include: {
          _count: { select: { responses: true } },
          categoryRef: { select: { name: true } },
          categories: {
            select: { category: { select: { name: true } } },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    const serialized = requests.map(({ categories, ...rest }) => {
      const joinedNames = categories
        .map((link) => link.category?.name?.trim() ?? "")
        .filter((name) => name.length > 0);
      return {
        ...rest,
        categoryNames: joinedNames.length > 0
          ? joinedNames
          : rest.categoryRef?.name
            ? [rest.categoryRef.name]
            : [],
      };
    });

    return NextResponse.json({
      success: true,
      data: serialized,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin requests error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id, action, status } = await req.json();

    if (action === "delete") {
      await prisma.serviceRequest.delete({ where: { id } });
    } else if (action === "updateStatus" && status) {
      const validStatuses = ["PENDING_CONFIRMATION", "OPEN", "IN_PROGRESS", "CLOSED"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ success: false, error: "Netinkamas statusas" }, { status: 400 });
      }
      // When admin re-opens a request, clear the accepted response
      const data: Record<string, unknown> = { status };
      if (status === "OPEN") {
        data.acceptedResponseId = null;
      }
      await prisma.serviceRequest.update({ where: { id }, data });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin request action error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
