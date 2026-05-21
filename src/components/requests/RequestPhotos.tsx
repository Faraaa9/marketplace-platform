import Image from "next/image";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-image";

/** Read-only thumbnail row of request attachment photos. Each opens full-size. */
export default function RequestPhotos({ urls }: { urls: string[] }) {
  if (!urls || urls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative h-20 w-20 overflow-hidden rounded-lg border border-surface-200 transition-opacity hover:opacity-90 dark:border-surface-700 sm:h-24 sm:w-24"
        >
          <Image
            src={optimizeCloudinaryUrl(url, { width: 192, height: 192, crop: "fill" })}
            alt={`Nuotrauka ${i + 1}`}
            fill
            sizes="96px"
            className="object-cover"
            priority={i < 2}
          />
        </a>
      ))}
    </div>
  );
}
