import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { countNewLeads } from "@/lib/account/provider-leads";
import { countOffers, countUnreadThreads, getProviderBasics } from "@/lib/account/provider-data";

// Counts for the provider account sidebar. Reads the balance straight from the
// DB (not the cached provider guard) so it updates right after an unlock.
export async function GET() {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }
    const userId = session.user.id;
    const [basics, newLeads, unreadMessages, offers] = await Promise.all([
      getProviderBasics(userId),
      countNewLeads(userId),
      countUnreadThreads(userId),
      countOffers(userId),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        credits: basics.profile?.creditBalance ?? 0,
        newLeads,
        unreadMessages,
        completeness: basics.completeness,
        offers,
      },
    });
  } catch (error) {
    console.error("Provider summary error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
