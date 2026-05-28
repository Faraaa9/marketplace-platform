import { NextRequest, NextResponse } from "next/server";
import {
  getCloudinaryErrorDetails,
  getConfiguredCloudinary,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";


const MAX_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Image upload for service-request attachments.
 *
 * Public — the new-request form is used by anonymous guests, so this endpoint
 * does NOT require a session. Abuse is bounded by an IP rate limit plus the
 * size and MIME-type checks. Uploaded URLs are attached to a request only when
 * the form is submitted.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = await rateLimitAsync(`requests:upload:${ip}`, RATE_LIMITS.api);
    if (!limit.success) {
      return NextResponse.json(
        { success: false, error: "Per daug įkėlimų. Pabandykite vėliau." },
        { status: 429 },
      );
    }

    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        { success: false, error: "Nuotraukų įkėlimo paslauga nekonfigūruota" },
        { status: 503 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Nepateikta nuotrauka" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Leidžiami tik paveikslėliai" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: "Failas per didelis (max 25MB)" }, { status: 400 });
    }

    const cloudinary = getConfiguredCloudinary();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "marketplace/requests",
            transformation: [
              {
                width: 1600,
                height: 1600,
                crop: "limit",
                quality: "auto",
                fetch_format: "auto",
              },
            ],
          },
          (error, result) => {
            if (error || !result) reject(error || new Error("Upload failed"));
            else resolve({ secure_url: result.secure_url, public_id: result.public_id });
          },
        )
        .end(buffer);
    });

    return NextResponse.json({
      success: true,
      data: { url: result.secure_url, publicId: result.public_id },
    });
  } catch (error) {
    console.error("Request image upload error:", error);
    const { status, message } = getCloudinaryErrorDetails(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
