import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cloudinary, isConfigured } from "@/lib/cloudinary";

export async function DELETE(req: NextRequest, { params }: { params: { publicId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "Profilis nerastas" }, { status: 404 });
    }

    const currentImages: string[] = JSON.parse(profile.images || "[]");
    const decodedPublicId = decodeURIComponent(params.publicId);

    const filteredImages = currentImages.filter((imgStr) => {
      try {
        const img = JSON.parse(imgStr);
        return img.publicId !== decodedPublicId;
      } catch {
        return true;
      }
    });

    if (filteredImages.length === currentImages.length) {
      return NextResponse.json({ success: false, error: "Nuotrauka nerasta" }, { status: 404 });
    }

    // Delete from Cloudinary
    if (isConfigured) {
      try {
        await cloudinary.uploader.destroy(decodedPublicId);
      } catch (error) {
        console.error("Cloudinary delete error:", error);
      }
    }

    await prisma.providerProfile.update({
      where: { userId: session.user.id },
      data: { images: JSON.stringify(filteredImages) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete image error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
