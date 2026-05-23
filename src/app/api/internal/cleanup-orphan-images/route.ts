import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getConfiguredCloudinary,
  isCloudinaryConfigured,
  publicIdFromCloudinaryUrl,
} from "@/lib/cloudinary";

export const dynamic = "force-dynamic"; // cron endpoint
export const maxDuration = 60;

const ORPHAN_AGE_HOURS = 24;
const CLEANUP_FOLDER = "marketplace/requests";
const MAX_BATCH = 500;

interface CloudinaryResource {
  public_id: string;
  created_at: string;
}

/**
 * GET /api/internal/cleanup-orphan-images
 *
 * Vercel Cron — sweeps orphan request attachment images.
 *
 * Why this exists: /api/requests/upload-image is anonymous and clients may
 * abandon the form after uploading. Those assets pile up in Cloudinary and
 * cost money. This endpoint cross-references Cloudinary's `marketplace/requests`
 * folder against the ServiceRequest.attachmentUrls column and deletes assets
 * older than ORPHAN_AGE_HOURS that are not referenced by any request.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { success: false, error: "Cloudinary not configured" },
      { status: 503 },
    );
  }

  try {
    const cloudinary = getConfiguredCloudinary();
    const cutoff = new Date(Date.now() - ORPHAN_AGE_HOURS * 60 * 60 * 1000);

    // 1. List candidate assets from Cloudinary (max batch per run; another run handles the rest)
    const listResult = await cloudinary.api.resources({
      type: "upload",
      prefix: `${CLEANUP_FOLDER}/`,
      max_results: MAX_BATCH,
    });

    const resources = (listResult.resources as CloudinaryResource[]) ?? [];
    const olderThanCutoff = resources.filter(
      (r) => new Date(r.created_at) < cutoff,
    );

    if (olderThanCutoff.length === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        scanned: resources.length,
        message: "No candidate assets older than cutoff",
      });
    }

    // 2. Collect all referenced public IDs from ServiceRequest.attachmentUrls
    const requests = await prisma.serviceRequest.findMany({
      select: { attachmentUrls: true },
      where: { attachmentUrls: { isEmpty: false } },
    });

    const referenced = new Set<string>();
    for (const r of requests) {
      for (const url of r.attachmentUrls) {
        const pid = publicIdFromCloudinaryUrl(url);
        if (pid) referenced.add(pid);
      }
    }

    // 3. Find orphans — older than cutoff and not referenced
    const orphans = olderThanCutoff.filter((r) => !referenced.has(r.public_id));

    if (orphans.length === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        scanned: resources.length,
        referenced: referenced.size,
        message: "No orphan assets found",
      });
    }

    // 4. Bulk delete (Cloudinary delete_resources accepts up to 100 per call)
    let deletedCount = 0;
    for (let i = 0; i < orphans.length; i += 100) {
      const batch = orphans.slice(i, i + 100).map((r) => r.public_id);
      const result = await cloudinary.api.delete_resources(batch);
      deletedCount += Object.keys(result.deleted ?? {}).length;
    }

    console.info(
      `[cleanup-orphan-images] Deleted ${deletedCount} orphan assets from ${CLEANUP_FOLDER}`,
    );

    return NextResponse.json({
      success: true,
      deletedCount,
      scanned: resources.length,
      candidates: olderThanCutoff.length,
      referenced: referenced.size,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    console.error("[cleanup-orphan-images] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
