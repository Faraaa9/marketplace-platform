import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";

export const dynamic = "force-dynamic";

/**
 * Every request this provider has responded to, with the outcome of each
 * offer derived from its parent request. Powers the "Mano atsakymai" page.
 */
export async function GET() {
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const rows = await prisma.response.findMany({
      where: { providerId: guard.userId },
      select: {
        id: true,
        price: true,
        createdAt: true,
        request: {
          select: {
            id: true,
            title: true,
            location: true,
            status: true,
            acceptedResponseId: true,
            categoryRef: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = rows.map((row) => {
      // Outcome comes from the parent request: "priimti" when this is the
      // accepted offer, "laukia" while the request is still open with nothing
      // accepted, "nepasirinkti" once another offer won or it closed.
      let status: "laukia" | "priimti" | "nepasirinkti";
      if (row.request.acceptedResponseId === row.id) {
        status = "priimti";
      } else if (
        row.request.acceptedResponseId === null &&
        row.request.status === "OPEN"
      ) {
        status = "laukia";
      } else {
        status = "nepasirinkti";
      }

      return {
        responseId: row.id,
        requestId: row.request.id,
        title: row.request.title,
        categoryName: row.request.categoryRef?.name ?? null,
        location: row.request.location,
        price: row.price,
        createdAt: row.createdAt,
        status,
      };
    });

    return NextResponse.json({ success: true, data: { items } });
  } catch (error) {
    console.error("Provider responses error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
