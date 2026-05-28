import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { providerProfileSchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";
import { moderateText } from "@/lib/moderation";
import { publicIdFromCloudinaryUrl } from "@/lib/cloudinary";

export async function GET() {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PROVIDER") {
      return NextResponse.json(
        { success: false, error: "Neturite tiekėjo rolės", code: "NOT_PROVIDER" },
        { status: 403 }
      );
    }

    const [profile, user] = await Promise.all([
      prisma.providerProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          userId: true,
          description: true,
          headline: true,
          services: true,
          priceFrom: true,
          experienceYears: true,
          offersInvoices: true,
          availableForUrgent: true,
          location: true,
          phone: true,
          website: true,
          isActive: true,
          planType: true,
          planExpiresAt: true,
          images: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
          categories: {
            select: { categoryId: true, sortOrder: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, emailVerified: true },
      }),
    ]);

    const parsedImages: { url: string; publicId: string }[] = profile
      ? profile.images.map((url) => ({
          url,
          publicId: publicIdFromCloudinaryUrl(url) ?? "",
        }))
      : [];

    const data = profile ? {
      ...profile,
      images: parsedImages,
      categoryIds: profile.categories.map((c) => c.categoryId),
      userName: user?.name || null,
      userEmail: user?.email || null,
      emailVerified: !!user?.emailVerified,
    } : null;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PROVIDER") {
      return NextResponse.json(
        { success: false, error: "Neturite tiekėjo rolės", code: "NOT_PROVIDER" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = providerProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: (parsed.error.issues?.[0]?.message || "Validacijos klaida") }, { status: 400 });
    }

    const moderation = await moderateText({
      entityType: "ProviderProfile",
      fields: {
        description: parsed.data.description,
        headline: parsed.data.headline,
        services: parsed.data.services,
      },
      actorUserId: session.user.id,
    });
    if (moderation.verdict === "reject") {
      return NextResponse.json(
        {
          success: false,
          error:
            moderation.userMessage ??
            "Tekste aptikta netinkamo turinio. Pataisykite ir bandykite dar kartą.",
        },
        { status: 422 },
      );
    }

    // Curated service categories, de-duplicated, order preserved.
    const categoryIds = [...new Set(parsed.data.categoryIds)].slice(0, 20);

    // Resolve the new moderation status. "reject" already returned above.
    // - "ok"               → APPROVED
    // - "review" via AI    → PENDING (genuine flag, admin will review)
    // - "review" via fallback (AI down) → keep current status so an infra
    //   blip doesn't silently hide already-approved profiles.
    const currentProfile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { moderationStatus: true },
    });
    let nextModerationStatus: string;
    if (moderation.verdict === "ok") {
      nextModerationStatus = "APPROVED";
    } else if (moderation.source === "ai_fallback") {
      nextModerationStatus = currentProfile?.moderationStatus || "APPROVED";
    } else {
      nextModerationStatus = "PENDING";
    }

    const profile = await prisma.$transaction(async (tx) => {
      const updated = await tx.providerProfile.update({
        where: { userId: session.user.id },
        data: {
          description: sanitizeHtml(parsed.data.description),
          headline: parsed.data.headline ? sanitizeHtml(parsed.data.headline) : null,
          services: parsed.data.services ? sanitizeHtml(parsed.data.services) : null,
          moderationStatus: nextModerationStatus,
          moderationReason: moderation.reason,
          moderatedAt: new Date(),
          priceFrom: parsed.data.priceFrom ?? null,
          experienceYears: parsed.data.experienceYears ?? null,
          offersInvoices: parsed.data.offersInvoices ?? false,
          availableForUrgent: parsed.data.availableForUrgent ?? false,
          location: parsed.data.location,
          phone: parsed.data.phone || null,
          website: parsed.data.website || null,
        },
        select: {
          id: true,
          userId: true,
          description: true,
          headline: true,
          services: true,
          priceFrom: true,
          experienceYears: true,
          offersInvoices: true,
          availableForUrgent: true,
          location: true,
          phone: true,
          website: true,
          isActive: true,
          planType: true,
          planExpiresAt: true,
          images: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Sync ProviderProfileCategory rows: drop rows no longer chosen,
      // create new ones with sortOrder following the submitted order.
      const existing = await tx.providerProfileCategory.findMany({
        where: { providerProfileId: updated.id },
        select: { categoryId: true },
      });
      const existingIds = new Set(existing.map((c) => c.categoryId));
      const nextIds = new Set(categoryIds);

      const toRemove = [...existingIds].filter((id) => !nextIds.has(id));
      if (toRemove.length > 0) {
        await tx.providerProfileCategory.deleteMany({
          where: { providerProfileId: updated.id, categoryId: { in: toRemove } },
        });
      }

      const toAdd = categoryIds
        .map((categoryId, index) => ({ categoryId, sortOrder: index }))
        .filter((c) => !existingIds.has(c.categoryId));
      if (toAdd.length > 0) {
        await tx.providerProfileCategory.createMany({
          data: toAdd.map((c) => ({
            providerProfileId: updated.id,
            categoryId: c.categoryId,
            sortOrder: c.sortOrder,
          })),
        });
      }

      // Keep sortOrder aligned with the submitted order for kept rows.
      await Promise.all(
        categoryIds
          .map((categoryId, index) => ({ categoryId, sortOrder: index }))
          .filter((c) => existingIds.has(c.categoryId))
          .map((c) =>
            tx.providerProfileCategory.update({
              where: {
                providerProfileId_categoryId: {
                  providerProfileId: updated.id,
                  categoryId: c.categoryId,
                },
              },
              data: { sortOrder: c.sortOrder },
            }),
          ),
      );

      return { ...updated, categoryIds };
    });

    if (moderation.verdict !== "ok") {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: "PROFILE_PENDING_REVIEW",
          title: "Profilis peržiūrimas",
          body: "Jūsų profilio pakeitimai gauti ir bus matomi viešai po peržiūros.",
          link: "/tiekejas/profilis",
        },
      });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const isActive = Boolean(body?.isActive);

    const existing = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.providerProfile.update({
      where: { id: existing.id },
      data: { isActive },
      select: { id: true, isActive: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Toggle profile error:", error);
    return NextResponse.json(
      { success: false, error: "Klaida" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const existing = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    await prisma.providerProfileCategory.deleteMany({
      where: { providerProfileId: existing.id },
    });
    await prisma.providerProfile.delete({ where: { id: existing.id } });

    // Demote user back to CLIENT
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "CLIENT" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete profile error:", error);
    return NextResponse.json(
      { success: false, error: "Klaida" },
      { status: 500 }
    );
  }
}
