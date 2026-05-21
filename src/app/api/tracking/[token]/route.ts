import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceRequestEditSchema } from "@/lib/validations";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { isCloudinaryConfigured, getConfiguredCloudinary, publicIdFromCloudinaryUrl } from "@/lib/cloudinary";

/**
 * Edit (PATCH) and delete (DELETE) a service request, authenticated by tracking token.
 *
 * Auth: possession of the tracking token proves ownership. For logged-in clients,
 * session.user.id must match request.clientId if one is set.
 *
 * Both actions are only allowed while the request is OPEN — once a provider has
 * been accepted (IN_PROGRESS) or the request is CLOSED, it is locked.
 */

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const ip = getClientIp(req);
    const limit = await rateLimitAsync(`requests:edit:${ip}`, RATE_LIMITS.api);
    if (!limit.success) {
      return NextResponse.json({ success: false, error: "Per daug užklausų. Pabandykite vėliau." }, { status: 429 });
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { trackingToken: token },
      select: { id: true, status: true, clientId: true },
    });
    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    if (session?.user?.id && request.clientId && request.clientId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Neturite teisės valdyti šios užklausos" }, { status: 403 });
    }

    if (request.status !== "OPEN") {
      return NextResponse.json(
        { success: false, error: "Užklausos nebegalima redaguoti — ji jau vykdoma arba uždaryta." },
        { status: 409 },
      );
    }

    const body = await req.json();
    const parsed = serviceRequestEditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Neteisingi duomenys" },
        { status: 400 },
      );
    }

    await prisma.serviceRequest.update({
      where: { id: request.id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Request edit error:", error);
    return NextResponse.json({ success: false, error: "Klaida redaguojant užklausą" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const ip = getClientIp(req);
    const limit = await rateLimitAsync(`requests:delete:${ip}`, RATE_LIMITS.api);
    if (!limit.success) {
      return NextResponse.json({ success: false, error: "Per daug užklausų. Pabandykite vėliau." }, { status: 429 });
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { trackingToken: token },
      select: { id: true, status: true, clientId: true, attachmentUrls: true },
    });
    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    if (session?.user?.id && request.clientId && request.clientId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Neturite teisės valdyti šios užklausos" }, { status: 403 });
    }

    if (request.status !== "OPEN") {
      return NextResponse.json(
        { success: false, error: "Negalima ištrinti — užklausa jau vykdoma arba uždaryta." },
        { status: 409 },
      );
    }

    // Cascades remove responses, messages, views and reviews (schema onDelete: Cascade).
    await prisma.serviceRequest.delete({ where: { id: request.id } });

    // Best-effort cleanup of attached Cloudinary images.
    if (request.attachmentUrls.length > 0 && isCloudinaryConfigured()) {
      const cloudinary = getConfiguredCloudinary();
      await Promise.all(
        request.attachmentUrls.map((url) => {
          const publicId = publicIdFromCloudinaryUrl(url);
          return publicId ? cloudinary.uploader.destroy(publicId).catch(() => {}) : Promise.resolve();
        }),
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Request delete error:", error);
    return NextResponse.json({ success: false, error: "Klaida trinant užklausą" }, { status: 500 });
  }
}
