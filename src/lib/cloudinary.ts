import { v2 as cloudinary } from "cloudinary";

type CloudinaryErrorShape = {
  message?: string;
  http_code?: number;
};

export function isCloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export function getConfiguredCloudinary() {
  if (!isCloudinaryConfigured()) {
    console.warn("WARNING: Cloudinary not configured — image uploads will fail");
    return cloudinary;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  // Some shells or deployment environments may still carry an old CLOUDINARY_URL.
  // Force a fresh value from the explicit env vars so the SDK does not reuse a placeholder.
  process.env.CLOUDINARY_URL = `cloudinary://${apiKey}:${apiSecret}@${cloudName}`;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return cloudinary;
}

export function getCloudinaryErrorDetails(error: unknown): { status: number; message: string } {
  const topLevel = (error ?? {}) as CloudinaryErrorShape & { error?: CloudinaryErrorShape };
  const nested = topLevel.error;
  const message = nested?.message || topLevel.message || "";
  const httpCode = nested?.http_code || topLevel.http_code;

  if (!message) {
    return {
      status: 500,
      message: "Nepavyko susisiekti su nuotraukų įkėlimo paslauga",
    };
  }

  if (message.includes("unknown api_key") || httpCode === 401) {
    return {
      status: 503,
      message: "Nuotraukų įkėlimo paslauga sukonfigūruota neteisingai. Patikrinkite Cloudinary API raktus.",
    };
  }

  if (message.includes("Must supply cloud_name")) {
    return {
      status: 503,
      message: "Nuotraukų įkėlimo paslauga nekonfigūruota. Trūksta Cloudinary cloud name.",
    };
  }

  return {
    status: 500,
    message: `Cloudinary klaida: ${message}`,
  };
}

/**
 * Extracts the Cloudinary `public_id` from a delivery URL.
 *
 * Cloudinary URLs look like:
 *   https://res.cloudinary.com/<cloud>/image/upload/v1234567890/folder/sub/file.jpg
 *   https://res.cloudinary.com/<cloud>/image/upload/c_fill,w_800/v1234567890/folder/file.png
 *
 * Returns the `folder/sub/file` portion (without the `vNNN/` version prefix and
 * without the file extension), or `null` if it can't be parsed.
 */
export function publicIdFromCloudinaryUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const uploadIdx = url.indexOf("/upload/");
  if (uploadIdx === -1) return null;
  let rest = url.slice(uploadIdx + "/upload/".length);
  // Strip transformation segments (any leading segment containing a comma or starting with c_, w_, etc.).
  // Cloudinary stops transformations at the first `vNNN` or the actual public_id.
  const segments = rest.split("/");
  while (segments.length > 0 && /^[a-z]_[^/]+(,[a-z]_[^/]+)*$/.test(segments[0])) {
    segments.shift();
  }
  // Strip version prefix `vNNNN`.
  if (segments[0] && /^v\d+$/.test(segments[0])) {
    segments.shift();
  }
  rest = segments.join("/");
  if (!rest) return null;
  // Strip extension.
  return rest.replace(/\.[^./]+$/, "");
}

export { cloudinary };
