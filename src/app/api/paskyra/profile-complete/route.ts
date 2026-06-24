import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncFreeCategories } from "@/lib/provider-categories";

interface CompleteProfileRequest {
  description: string;
  categoryIds: string[];
  phone?: string;
  image?: string;
}

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CompleteProfileRequest;
    const { description, categoryIds, image } = body;

    if (!description || !categoryIds.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Defensive: phone must be a single string or null
    const phone =
      Array.isArray(body.phone)
        ? body.phone[0] || null
        : typeof body.phone === "string"
        ? body.phone
        : null;

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { providerProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate slug from user name if profile has no slug
    const baseSlug = (user.name || session.user.email!.split("@")[0])
      .toLowerCase()
      .replace(/[ąčęėįšųūž]/g, (c) => {
        const map: Record<string, string> = {
          ą: "a",
          č: "c",
          ę: "e",
          ė: "e",
          į: "i",
          š: "s",
          ų: "u",
          ū: "u",
          ž: "z",
        };
        return map[c] || c;
      })
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    // Create or update provider profile
    let providerProfile = user.providerProfile;

    if (!providerProfile) {
      // Ensure unique slug
      let slug = baseSlug;
      let suffix = 0;
      while (
        await prisma.providerProfile.findUnique({ where: { slug } })
      ) {
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }

      providerProfile = await prisma.providerProfile.create({
        data: {
          userId: user.id,
          slug,
          description,
          phone: phone || null,
          images: image ? [image] : [],
          isActive: true,
          status: "claimed",
          sourceType: "self_created",
        },
      });
    } else {
      providerProfile = await prisma.providerProfile.update({
        where: { id: providerProfile.id },
        data: {
          slug: providerProfile.slug || baseSlug,
          description,
          phone: phone || null,
          images: image ? [image] : providerProfile.images,
          isActive: true,
        },
      });
    }

    await prisma.$transaction((tx) =>
      syncFreeCategories(tx, providerProfile.id, categoryIds),
    );

    return NextResponse.json({
      success: true,
      profileId: providerProfile.id,
      slug: providerProfile.slug,
    });
  } catch (error) {
    console.error("Profile completion error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Profile completion failed",
      },
      { status: 500 }
    );
  }
}
