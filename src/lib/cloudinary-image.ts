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
