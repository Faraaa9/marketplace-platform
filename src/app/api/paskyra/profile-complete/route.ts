import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface CompleteProfileRequest {
  description: string;
  categoryIds: string[];
  phone?: string;
  image?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CompleteProfileRequest;
    const { description, categoryIds, phone, image } = body;

    if (!description || !categoryIds.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { providerProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create or update provider profile
    let providerProfile = user.providerProfile;

    if (!providerProfile) {
      providerProfile = await prisma.providerProfile.create({
        data: {
          userId: user.id,
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
          description,
          phone: phone || null,
          images: image ? [image] : providerProfile.images,
          isActive: true,
        },
      });
    }

    // Add categories
    await prisma.providerProfileCategory.deleteMany({
      where: { providerProfileId: providerProfile.id },
    });

    for (const categoryId of categoryIds) {
      await prisma.providerProfileCategory.create({
        data: {
          providerProfileId: providerProfile.id,
          categoryId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      profileId: providerProfile.id,
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
