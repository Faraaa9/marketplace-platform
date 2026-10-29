import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCustomerOverview } from "@/lib/account/customer-data";

// Counts for the customer account sidebar.
export async function GET() {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }
    const overview = await getCustomerOverview(session.user.id);
    return NextResponse.json({
      success: true,
      data: {
        attention: overview.attention.length,
        active: overview.active.length,
        unreadMessages: overview.unreadThreads,
      },
    });
  } catch (error) {
    console.error("Customer summary error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
