import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [totalUsers, totalProviders, totalRequests, totalResponses] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "PROVIDER" } }),
      prisma.serviceRequest.count(),
      prisma.response.count(),
    ]);

    // Last 14 days requests for chart
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await prisma.serviceRequest.count({
        where: {
          createdAt: { gte: date, lt: nextDate },
        },
      });

      days.push({
        date: date.toISOString().split("T")[0],
        label: date.toLocaleDateString("lt-LT", { month: "short", day: "numeric" }),
        count,
      });
    }

    return NextResponse.json({
      success: true,
      data: { totalUsers, totalProviders, totalRequests, totalResponses, chartData: days },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
