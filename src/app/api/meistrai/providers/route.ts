import { NextResponse } from "next/server";
import { buildProviderCards, getProvidersListingData } from "@/lib/providers-listing";

// Same `unstable_cache` backing /meistrai/page.tsx — calling it here hits
// the shared Next.js data cache, so the lazy hydration request typically
// resolves in <50ms once the page has warmed it.
export async function GET() {
  const data = await getProvidersListingData();
  const providers = buildProviderCards(data);
  return NextResponse.json(
    { providers },
    {
      headers: {
        // Mirror the 60s revalidate window of the page-level cache. Vercel's
        // shared cache will serve repeat requests from the edge.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
