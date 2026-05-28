import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConfiguredCloudinary } from "@/lib/cloudinary";

/**
 * DELETE — remove a story owned by the current provider
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const story = await prisma.providerStory.findUnique({
      where: { id },
      select: { providerId: true, imagePublicId: true },
    });

    if (!story) {
      return NextResponse.json({ success: false, error: "Story nerasta" }, { status: 404 });
    }

    if (story.providerId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Neturite teisės" }, { status: 403 });
    }

    // Delete from Cloudinary
    if (story.imagePublicId) {
      try {
        const cloudinary = getConfiguredCloudinary();
        await cloudinary.uploader.destroy(story.imagePublicId);
      } catch (err) {
        console.error("Cloudinary delete error (non-fatal):", err);
      }
    }

    await prisma.providerStory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Story delete error:", error);
    return NextResponse.json({ success: false, error: "Nepavyko pašalinti story" }, { status: 500 });
  }
}
