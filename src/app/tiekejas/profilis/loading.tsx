import Skeleton from "@/components/ui/Skeleton";

export default function ProfileEditorLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10 pb-24">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />

      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="mt-6 rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-10 w-full rounded-lg" />
          <Skeleton className="mt-3 h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
