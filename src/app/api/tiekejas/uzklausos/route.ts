import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const category = searchParams.get("category") || "";
    const location = searchParams.get("location") || "";
    const perPage = 20;

    // Load provider profile for relevance scoring
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: guard.userId },
      select: { specializations: true, location: true },
    });

    const providerSpecs: string[] = profile?.specializations
      ? JSON.parse(profile.specializations)
      : [];
    const providerLocation = profile?.location || "";

    // Build filter — user-selected filters narrow the set
    const where: Record<string, unknown> = { status: "OPEN" };
    if (category) where.category = category;
    if (location) where.location = location;

    // Fetch all matching requests (for scoring + pagination)
    // In a large-scale app this would use SQL CASE WHEN ordering;
    // for MVP volumes this is simpler and easier to maintain.
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
      },
      orderBy: { createdAt: "desc" },
    });

    // Score and sort
    // +2  specialization match (request category is in provider's specializations)
    // +1  location match (exact match OR request is "Visa Lietuva")
    // Tie-break: newest first
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
      return { ...req, relevance: score };
    });

    scored.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = scored.length;
    const pages = Math.ceil(total / perPage);
    const paginated = scored.slice((page - 1) * perPage, page * perPage);

    return NextResponse.json({
      success: true,
      data: { requests: paginated, total, pages, page },
    });
  } catch (error) {
    console.error("Provider requests error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
