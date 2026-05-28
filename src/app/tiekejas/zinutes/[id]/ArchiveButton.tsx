"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Archive, ArchiveRestore } from "lucide-react";

/**
 * Archive / restore a direct inquiry. The status badge is server-rendered, so
 * on success we refresh the route to re-stream the thread with the new status.
 */
export function ArchiveButton({
  inquiryId,
  status,
}: {
  inquiryId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const isArchived = status === "ARCHIVED";

  async function toggle() {
    const next = isArchived ? "READ" : "ARCHIVED";
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tiekejas/zinutes/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (data.success) {
        startTransition(() => router.refresh());
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      isLoading={submitting || isPending}
    >
      {isArchived ? (
        <ArchiveRestore className="h-4 w-4" />
      ) : (
        <Archive className="h-4 w-4" />
      )}
      {isArchived ? "Grąžinti" : "Archyvuoti"}
    </Button>
  );
}
