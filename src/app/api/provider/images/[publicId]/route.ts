import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getCloudinaryErrorDetails,
  getConfiguredCloudinary,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";

export async function DELETE(req: NextRequest, { params }: { params: { publicId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { images: true },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Neturite tiekėjo profilio" },
        { status: 403 }
      );
    }

    const currentImages: unknown[] = JSON.parse(profile.images || "[]");
    const decodedPublicId = decodeURIComponent(params.publicId);

    // Normalize: parse double-encoded strings into objects
    const normalized = currentImages.map((img) => {
      if (typeof img === "string") {
        try { return JSON.parse(img); } catch { return null; }
      }
      return img;
    }).filter(Boolean) as { url: string; publicId: string }[];

    const filteredImages = normalized.filter((img) => img.publicId !== decodedPublicId);

    if (filteredImages.length === normalized.length) {
      return NextResponse.json({ success: false, error: "Nuotrauka nerasta" }, { status: 404 });
    }

    // Delete from Cloudinary
    if (isCloudinaryConfigured()) {
      try {
        const cloudinary = getConfiguredCloudinary();
        await cloudinary.uploader.destroy(decodedPublicId);
      } catch (error) {
        console.error("Cloudinary delete error:", error);
        const { status, message } = getCloudinaryErrorDetails(error);
        return NextResponse.json({ success: false, error: message }, { status });
      }
    }

    await prisma.providerProfile.update({
      where: { userId: session.user.id },
      data: { images: JSON.stringify(filteredImages) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete image error:", error);
    const { status, message } = getCloudinaryErrorDetails(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
