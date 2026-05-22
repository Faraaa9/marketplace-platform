import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { parseSpecializations } from "@/lib/provider-eligibility";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const category = searchParams.get("category") || "";
    const location = searchParams.get("location") || "";
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "relevance";
    const perPage = 20;

    // Load provider profile for relevance scoring
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: guard.userId },
      select: { specializations: true, location: true },
    });

    const providerSpecs = parseSpecializations(profile?.specializations);
    const providerLocation = profile?.location || "";

    // Build filter — only matching specializations, exclude own requests
    const where: Record<string, unknown> = {
      status: "OPEN",
      moderationStatus: "APPROVED",
      clientId: { not: guard.userId },
    };
    // Filter by provider specializations (only show requests they can respond to)
    if (providerSpecs.length > 0) {
      if (category) {
        // If explicit category filter, use it (but only if it's in their specs)
        where.category = category;
      } else {
        // Default: only show categories matching provider's specializations
        where.category = { in: providerSpecs };
      }
    } else {
      // No specializations — show nothing (they need to set up profile first)
      where.category = { in: [] };
    }
    if (location) where.location = location;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const allRequests = await prisma.serviceRequest.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        location: true,
        budget: true,
        status: true,
        createdAt: true,
        _count: { select: { responses: true } },
        responses: {
          where: { providerId: guard.userId },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Score relevance + mark responded
    const scored = allRequests.map((req) => {
      let score = 0;
      if (providerSpecs.includes(req.category)) score += 2;
      if (
        req.location === providerLocation ||
        req.location === "Visa Lietuva" ||
        providerLocation === "Visa Lietuva"
      ) {
        score += 1;
      }
      const { responses, ...rest } = req;
      return { ...rest, relevance: score, hasResponded: responses.length > 0 };
    });

    // Sort
    if (sort === "newest") {
      scored.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      // relevance (default)
      scored.sort((a, b) => {
        if (b.relevance !== a.relevance) return b.relevance - a.relevance;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }

    const total = scored.length;
    const pages = Math.ceil(total / perPage);
    const paginated = scored.slice((page - 1) * perPage, page * perPage);

    return NextResponse.json({
      success: true,
      data: {
        requests: paginated,
        total,
        pages,
        page,
        hasSpecializations: providerSpecs.length > 0,
        providerSpecs,
      },
    });
  } catch (error) {
    console.error("Provider requests error:", error);
    return NextResponse.json(
      { success: false, error: "Klaida" },
      { status: 500 }
    );
  }
}
