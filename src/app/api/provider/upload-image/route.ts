import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moderateImages } from "@/lib/moderation";
import {
  getCloudinaryErrorDetails,
  getConfiguredCloudinary,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        { success: false, error: "Nuotraukų įkėlimo paslauga nekonfigūruota" },
        { status: 503 }
      );
    }

    const cloudinary = getConfiguredCloudinary();

    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Nepateikta nuotrauka" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Leidžiami tik paveikslėliai" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: "Failas per didelis (max 5MB)" }, { status: 400 });
    }

    // Check current image count
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

    const currentImages: string[] = profile.images ?? [];
    if (currentImages.length >= 5) {
      return NextResponse.json({ success: false, error: "Maksimalus nuotraukų skaičius — 5" }, { status: 400 });
    }

    // Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `marketplace/providers/${session.user.id}`,
          transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
        },
        (error, result) => {
          if (error || !result) reject(error || new Error("Upload failed"));
          else resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      ).end(buffer);
    });

    const moderation = await moderateImages({
      entityType: "ProviderProfile",
      imageUrls: [result.secure_url],
      actorUserId: session.user.id,
    });
    if (moderation.verdict === "reject") {
      await cloudinary.uploader.destroy(result.public_id).catch(() => {});
      return NextResponse.json(
        {
          success: false,
          error:
            moderation.userMessage ??
            "Nuotraukoje aptikta netinkamo turinio. Pasirinkite kitą nuotrauką.",
        },
        { status: 422 },
      );
    }

    const updatedImages: string[] = [...currentImages, result.secure_url];
    await prisma.providerProfile.update({
      where: { userId: session.user.id },
      data:
        moderation.verdict === "ok"
          ? { images: updatedImages }
          : {
              images: updatedImages,
              moderationStatus: "PENDING",
              moderationReason: moderation.reason,
              moderatedAt: new Date(),
            },
    });

    return NextResponse.json({
      success: true,
      data: { url: result.secure_url, publicId: result.public_id },
    });
  } catch (error) {
    console.error("Upload error:", error);
    const { status, message } = getCloudinaryErrorDetails(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
