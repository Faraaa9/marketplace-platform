import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decideClaim } from "@/lib/request-claim";

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

  const body = await req.json().catch(() => null);
  const trackingToken: unknown = body?.trackingToken;

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, emailVerified: true },
  });
  if (!user) {
    return NextResponse.json({ success: false, error: "Paskyra nerasta" }, { status: 401 });
  }

  switch (decideClaim(request, user)) {
    case "already_claimed":
      return NextResponse.json({ success: true, alreadyClaimed: true });
    case "owned_by_other":
      return NextResponse.json(
        { success: false, error: "Ši užklausa jau priskirta kitai paskyrai" },
        { status: 403 }
      );
    case "email_mismatch":
      return NextResponse.json(
        {
          success: false,
          error: "Užklausą galima priskirti tik paskyrai su tuo pačiu el. paštu, kuriuo ji pateikta.",
        },
        { status: 403 }
      );
    case "email_unverified":
      return NextResponse.json(
        { success: false, error: "Pirmiausia patvirtinkite savo el. paštą." },
        { status: 403 }
      );
  }

  // Conditional write: two accounts racing for one guest request can't both win.
  const attached = await prisma.serviceRequest.updateMany({
    where: { id: request.id, clientId: null },
    data: { clientId: user.id },
  });
  if (attached.count !== 1) {
    return NextResponse.json(
      { success: false, error: "Ši užklausa jau priskirta kitai paskyrai" },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true });
}
