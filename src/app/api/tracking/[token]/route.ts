import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceRequestEditSchema } from "@/lib/validations";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { isCloudinaryConfigured, getConfiguredCloudinary, publicIdFromCloudinaryUrl } from "@/lib/cloudinary";
import { revalidateTag } from "next/cache";
import { sanitizeHtml } from "@/lib/sanitize";
import { moderateText, moderateImages, mergeModeration } from "@/lib/moderation";

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
  await connection();
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

    const [textModeration, imageModeration] = await Promise.all([
      moderateText({
        entityType: "ServiceRequest",
        fields: {
          title: parsed.data.title,
          description: parsed.data.description,
          budget: parsed.data.budget,
          deadline: parsed.data.deadline,
        },
        actorUserId: session?.user?.id ?? request.clientId,
      }),
      moderateImages({
        entityType: "ServiceRequest",
        imageUrls: parsed.data.attachmentUrls ?? [],
        actorUserId: session?.user?.id ?? request.clientId,
      }),
    ]);
    const moderation = mergeModeration(textModeration, imageModeration);
    if (moderation.verdict === "reject") {
      return NextResponse.json(
        {
          success: false,
          error:
            moderation.userMessage ??
            "Skelbime aptikta netinkamo turinio. Pataisykite ir bandykite dar kartą.",
        },
        { status: 422 },
      );
    }

    // Validate the picked categories before touching the join table.
    const uniqueCategoryIds = Array.from(new Set(parsed.data.categoryIds));
    const categoryRows = await prisma.category.findMany({
      where: { id: { in: uniqueCategoryIds } },
      select: { id: true, slug: true },
    });
    if (categoryRows.length !== uniqueCategoryIds.length) {
      return NextResponse.json(
        { success: false, error: "Viena ar daugiau kategorijų nerasta" },
        { status: 400 },
      );
    }
    const orderedCategories = uniqueCategoryIds.map(
      (id) => categoryRows.find((row) => row.id === id)!,
    );
    const primaryCategory = orderedCategories[0];

    // categoryIds is not a column on ServiceRequest — strip it from the spread
    // so Prisma doesn't error. The join table is rewritten transactionally
    // below.
    const { categoryIds: _categoryIds, ...editableFields } = parsed.data;
    void _categoryIds;

    await prisma.$transaction([
      prisma.serviceRequestCategory.deleteMany({
        where: { requestId: request.id },
      }),
      prisma.serviceRequest.update({
        where: { id: request.id },
        data: {
          ...editableFields,
          title: sanitizeHtml(parsed.data.title),
          description: sanitizeHtml(parsed.data.description),
          budget: sanitizeHtml(parsed.data.budget),
          deadline: sanitizeHtml(parsed.data.deadline),
          category: primaryCategory.slug,
          categoryId: primaryCategory.id,
          categories: {
            create: orderedCategories.map((cat, index) => ({
              categoryId: cat.id,
              sortOrder: index,
            })),
          },
          moderationStatus: moderation.verdict === "ok" ? "APPROVED" : "PENDING",
          moderationReason: moderation.reason,
          moderatedAt: new Date(),
        },
      }),
    ]);

    revalidateTag("requests", { expire: 0 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Request edit error:", error);
    return NextResponse.json({ success: false, error: "Klaida redaguojant užklausą" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await connection();
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
