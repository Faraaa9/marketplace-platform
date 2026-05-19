/**
 * Transforms a Cloudinary delivery URL to include auto-format and auto-quality.
 * Safe to call on any URL — non-Cloudinary URLs are returned unchanged.
 * Avoids double-transforming URLs that already contain f_auto or q_auto.
 */
export function optimizeCloudinaryUrl(
  url: string,
  options?: { width?: number; height?: number; crop?: string }
): string {
  if (!url || !url.includes("res.cloudinary.com")) return url;

  // Already optimized — skip
  if (url.includes("f_auto") && url.includes("q_auto")) return url;

  // Cloudinary URL pattern: .../upload/[existing_transforms/]v1234/path
  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex === -1) return url;

  const before = url.slice(0, uploadIndex + "/upload/".length);
  const after = url.slice(uploadIndex + "/upload/".length);

  const transforms = ["f_auto", "q_auto"];
  if (options?.width) transforms.push(`w_${options.width}`);
  if (options?.height) transforms.push(`h_${options.height}`);
  if (options?.crop) transforms.push(`c_${options.crop}`);

  return `${before}${transforms.join(",")}/${after}`;
}

const ALLOWED_REMOTE_HOSTS = [
  "res.cloudinary.com",
  "images.unsplash.com",
  "paslaugos-img.dgn.lt",
];

/**
 * Provider/user images in production should come from Cloudinary uploads.
 * External hosts (Unsplash, paslaugos-img) are allowed so demo/seed and
 * imported-catalog photos render. Anything else returns null so next/image
 * does not spam the dev server with broken-host errors.
 */
export function getSafeProviderImageUrl(
  url: string | null | undefined,
  options?: { width?: number; height?: number; crop?: string }
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.includes("res.cloudinary.com")) {
    return optimizeCloudinaryUrl(trimmed, options);
  }
  if (ALLOWED_REMOTE_HOSTS.some((host) => trimmed.includes(host))) {
    return trimmed;
  }

  return null;
}
