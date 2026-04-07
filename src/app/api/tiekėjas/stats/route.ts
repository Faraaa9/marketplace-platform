import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [totalRequests, myResponses, profile] = await Promise.all([
      prisma.serviceRequest.count({ where: { status: "OPEN" } }),
      prisma.response.count({ where: { providerId: session.user.id } }),
      prisma.providerProfile.findUnique({ where: { userId: session.user.id } }),
    ]);

    const thisMonthResponses = await prisma.response.count({
      where: {
        providerId: session.user.id,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRequests,
        myResponses,
        thisMonthResponses,
        planType: profile?.planType || "FREE",
        isActive: profile?.isActive || false,
      },
    });
  } catch (error) {
    console.error("Provider stats error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
