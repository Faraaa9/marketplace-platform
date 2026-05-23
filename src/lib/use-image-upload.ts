"use client";

import { useCallback, useEffect, useState } from "react";

const MAX_SIZE = 25 * 1024 * 1024; // 25MB — keep in sync with /api/requests/upload-image

interface UseImageUploadOptions {
  /** Called with newly uploaded image URLs. */
  onUploaded: (urls: string[]) => void;
  /** Current attachment count, so we can enforce the maxFiles cap. */
  currentCount: number;
  /** Hard cap on how many images can be attached. */
  maxFiles?: number;
}

interface UseImageUploadResult {
  uploading: boolean;
  error: string;
  dragOver: boolean;
  /** Upload a batch of File objects (from file picker or drop event). */
  uploadFiles: (files: File[]) => Promise<void>;
  /** Spread onto any element that should accept drops. */
  dropHandlers: {
    onDragOver: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  clearError: () => void;
}

export function useImageUpload({
  onUploaded,
  currentCount,
  maxFiles = 5,
}: UseImageUploadOptions): UseImageUploadResult {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Global safety nets: if the browser swallows a leave/drop event (common when
  // dragging off the window), make sure the overlay still clears.
  useEffect(() => {
    const reset = () => setDragOver(false);
    window.addEventListener("dragend", reset);
    window.addEventListener("drop", reset);
    window.addEventListener("mouseleave", reset);
    return () => {
      window.removeEventListener("dragend", reset);
      window.removeEventListener("drop", reset);
      window.removeEventListener("mouseleave", reset);
    };
  }, []);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      setError("");
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        if (files.length > 0) setError("Leidžiami tik paveikslėliai");
        return;
      }
      const remaining = maxFiles - currentCount;
      if (remaining <= 0) {
        setError(`Daugiausia ${maxFiles} nuotraukos`);
        return;
      }
      const toUpload = imageFiles.slice(0, remaining);
      if (imageFiles.length > remaining) {
        setError(`Galima pridėti dar ${remaining} ${remaining === 1 ? "nuotrauką" : "nuotraukas"}`);
      }

      setUploading(true);
      const uploaded: string[] = [];
      try {
        for (const file of toUpload) {
          if (file.size > MAX_SIZE) {
            setError(`„${file.name}" per didelis (max 25 MB)`);
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
        if (uploaded.length > 0) onUploaded(uploaded);
      } finally {
        setUploading(false);
        // Belt-and-braces: clear the overlay once an upload finishes, in case
        // a swallowed leave/drop event left it stuck on.
        setDragOver(false);
      }
    },
    [currentCount, maxFiles, onUploaded],
  );

  const dropHandlers = {
    onDragOver: useCallback((e: React.DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      // Most reliable signal: as long as a file is hovering over the zone,
      // dragover fires repeatedly. Set state here instead of tracking enter
      // counts, which break when child elements swallow events.
      setDragOver(true);
    }, []),
    onDragEnter: useCallback((e: React.DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
      setDragOver(true);
    }, []),
    onDragLeave: useCallback((e: React.DragEvent) => {
      // Only treat this as a real leave when the cursor goes outside the drop
      // zone — moving between child elements fires leave + enter pairs that
      // would otherwise make the overlay flicker.
      const next = e.relatedTarget as Node | null;
      if (next && e.currentTarget.contains(next)) return;
      setDragOver(false);
    }, []),
    onDrop: useCallback(
      (e: React.DragEvent) => {
        setDragOver(false);
        if (!e.dataTransfer?.types?.includes("Files")) return;
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        void uploadFiles(files);
      },
      [uploadFiles],
    ),
  };

  return {
    uploading,
    error,
    dragOver,
    uploadFiles,
    dropHandlers,
    clearError: useCallback(() => setError(""), []),
  };
}
