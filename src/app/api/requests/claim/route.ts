import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/requests/claim
 * Attach a guest request to the logged-in user's account using the tracking token.
 */
export async function POST(req: NextRequest) {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Prisijunkite, kad galėtumėte priskirti užklausą" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { trackingToken } = body;

  if (!trackingToken || typeof trackingToken !== "string") {
    return NextResponse.json(
      { success: false, error: "Trūksta sekimo kodo" },
      { status: 400 }
    );
  }

  const request = await prisma.serviceRequest.findUnique({
    where: { trackingToken },
    select: { id: true, clientId: true, clientEmail: true },
  });

  if (!request) {
    return NextResponse.json(
      { success: false, error: "Užklausa nerasta" },
      { status: 404 }
    );
  }

  // Already owned by someone
  if (request.clientId) {
    if (request.clientId === session.user.id) {
      return NextResponse.json({ success: true, alreadyClaimed: true });
    }
    return NextResponse.json(
      { success: false, error: "Ši užklausa jau priskirta kitai paskyrai" },
      { status: 403 }
    );
  }

  // Attach to current user
  await prisma.serviceRequest.update({
    where: { id: request.id },
    data: { clientId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
