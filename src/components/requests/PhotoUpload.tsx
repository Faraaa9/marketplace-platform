"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-image";

interface PhotoUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxPhotos?: number;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** Multi-photo uploader for the service-request form. Uploads to Cloudinary
 *  via /api/requests/upload-image and manages a list of image URLs. */
export default function PhotoUpload({ value, onChange, maxPhotos = 5 }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const remaining = maxPhotos - value.length;

  async function uploadFiles(files: File[]) {
    setError("");
    if (files.length === 0) return;
    if (remaining <= 0) {
      setError(`Daugiausia ${maxPhotos} nuotraukos`);
      return;
    }

    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      setError(`Galima pridėti dar ${remaining} ${remaining === 1 ? "nuotrauką" : "nuotraukas"}`);
    }

    setUploading(true);
    const uploaded: string[] = [];
    for (const file of toUpload) {
      if (!file.type.startsWith("image/")) {
        setError("Leidžiami tik paveikslėliai");
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError(`„${file.name}" per didelis (max 5 MB)`);
        continue;
      }
      try {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/requests/upload-image", { method: "POST", body: fd });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && data.data?.url) {
          uploaded.push(data.data.url);
        } else {
          setError(data?.error || "Nepavyko įkelti nuotraukos");
        }
      } catch {
        setError("Nepavyko įkelti nuotraukos");
      }
    }
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
    setUploading(false);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    uploadFiles(files);
    e.target.value = ""; // allow re-selecting the same file
  }

  function removePhoto(url: string) {
    onChange(value.filter((u) => u !== url));
    setError("");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div
            key={url}
            className="group relative h-24 w-24 overflow-hidden rounded-xl border border-surface-200 dark:border-surface-700"
          >
            <Image
              src={optimizeCloudinaryUrl(url, { width: 192, height: 192, crop: "fill" })}
              alt={`Nuotrauka ${i + 1}`}
              fill
              sizes="96px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => removePhoto(url)}
              aria-label="Pašalinti nuotrauką"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              uploadFiles(Array.from(e.dataTransfer.files));
            }}
            disabled={uploading}
            className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-micro transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              dragOver
                ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/30"
                : "border-surface-300 text-surface-400 hover:border-brand-400 hover:text-brand-500 dark:border-surface-600"
            }`}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                <span>Pridėti</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      {error && <p className="mt-2 text-body-sm text-red-600 dark:text-red-400">{error}</p>}
      <p className="mt-2 text-micro text-surface-400">
        Iki {maxPhotos} nuotraukų, kiekviena iki 5 MB. Nuotraukos padeda tiekėjams tiksliau įkainoti.
      </p>
    </div>
  );
}
