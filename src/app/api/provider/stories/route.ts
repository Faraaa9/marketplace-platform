import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getCloudinaryErrorDetails,
  getConfiguredCloudinary,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { sanitizeHtml } from "@/lib/sanitize";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { isStoryEnabled } from "@/lib/platform-settings";
import { moderateText, moderateImages, mergeModeration } from "@/lib/moderation";

export const dynamic = "force-dynamic";

const MAX_ACTIVE_STORIES = 3;
const STORY_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_LENGTH = 200;

/**
 * GET — list active stories for the current provider
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // If stories are globally disabled, return empty list
    if (!(await isStoryEnabled())) {
      return NextResponse.json({ success: true, data: [], disabled: true });
    }

    const stories = await prisma.providerStory.findMany({
      where: {
        providerId: session.user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: stories });
  } catch (error) {
    console.error("Stories list error:", error);
    return NextResponse.json({ success: false, error: "Nepavyko gauti story" }, { status: 500 });
  }
}

/**
 * POST — create a new story (image + optional text)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if stories are globally enabled
    if (!(await isStoryEnabled())) {
      return NextResponse.json(
        { success: false, error: "Story funkcija šiuo metu išjungta" },
        { status: 403 }
      );
    }

    // Check provider is active
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { isActive: true },
    });

    if (!profile?.isActive) {
      return NextResponse.json(
        { success: false, error: "Tik aktyvūs tiekėjai gali kurti story" },
        { status: 403 }
      );
    }

    // Check active story count
    const activeCount = await prisma.providerStory.count({
      where: {
        providerId: session.user.id,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeCount >= MAX_ACTIVE_STORIES) {
      return NextResponse.json(
        { success: false, error: `Maksimalus aktyvių story skaičius — ${MAX_ACTIVE_STORIES}` },
        { status: 400 }
      );
    }

    // Rate limit — 6 story creates per hour per user
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`story:create:${session.user.id}:${ip}`, { maxRequests: 6, windowMs: 60 * 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug story. Pabandykite vėliau." },
        { status: 429 }
      );
    }

    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        { success: false, error: "Nuotraukų įkėlimo paslauga nekonfigūruota" },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const rawText = (formData.get("text") as string || "").trim().slice(0, MAX_TEXT_LENGTH);
    const text = rawText ? sanitizeHtml(rawText) : "";

    const moderation = await moderateText({
      entityType: "ProviderStory",
      fields: { text: rawText },
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

    if (!file) {
      return NextResponse.json({ success: false, error: "Nepateikta nuotrauka" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Leidžiami tik paveikslėliai" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ success: false, error: "Failas per didelis (max 5MB)" }, { status: 400 });
    }

    // Upload to Cloudinary
    const cloudinary = getConfiguredCloudinary();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `marketplace/stories/${session.user.id}`,
          transformation: [{ width: 1080, height: 1920, crop: "limit", quality: "auto" }],
        },
        (error, uploadResult) => {
          if (error || !uploadResult) reject(error || new Error("Upload failed"));
          else resolve({ secure_url: uploadResult.secure_url, public_id: uploadResult.public_id });
        }
      ).end(buffer);
    });

    // Moderate the uploaded image before the story goes live.
    const imageModeration = await moderateImages({
      entityType: "ProviderStory",
      imageUrls: [result.secure_url],
      actorUserId: session.user.id,
    });
    const merged = mergeModeration(moderation, imageModeration);
    if (merged.verdict === "reject") {
      await cloudinary.uploader.destroy(result.public_id).catch(() => {});
      return NextResponse.json(
        {
          success: false,
          error:
            merged.userMessage ??
            "Nuotraukoje aptikta netinkamo turinio. Pakeiskite nuotrauką ir bandykite dar kartą.",
        },
        { status: 422 },
      );
    }

    // Resolve moderation status. Stories live only 24h, so if the AI
    // moderation infra is down (ai_fallback) we'd rather show the story
    // than silently hide it for the full TTL. "reject" already exited above.
    const storyStatus =
      merged.verdict === "ok"
        ? "APPROVED"
        : merged.source === "ai_fallback"
          ? "APPROVED"
          : "PENDING";

    // Create story record
    const story = await prisma.providerStory.create({
      data: {
        providerId: session.user.id,
        imageUrl: result.secure_url,
        imagePublicId: result.public_id,
        text: text || null,
        moderationStatus: storyStatus,
        moderationReason: merged.reason,
        moderatedAt: new Date(),
        expiresAt: new Date(Date.now() + STORY_DURATION_MS),
      },
    });

    return NextResponse.json({ success: true, data: story }, { status: 201 });
  } catch (error) {
    console.error("Story create error:", error);
    const { status, message } = getCloudinaryErrorDetails(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
