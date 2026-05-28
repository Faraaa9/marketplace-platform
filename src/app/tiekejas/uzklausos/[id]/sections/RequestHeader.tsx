import { notFound } from "next/navigation";
import { MapPin, Clock, CalendarClock, Euro } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatRelativeDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";

const STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
  OPEN: { label: "Atidaryta", variant: "success" },
  IN_PROGRESS: { label: "Vykdoma", variant: "warning" },
  CLOSED: { label: "Uždaryta", variant: "default" },
};

export async function RequestHeader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    select: {
      title: true,
      category: true,
      categoryRef: { select: { name: true } },
      categories: {
        select: { category: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      },
      location: true,
      budget: true,
      deadline: true,
      status: true,
      createdAt: true,
    },
  });

  if (!request) notFound();

  const joinedNames = request.categories
    .map((link) => link.category?.name?.trim() ?? "")
    .filter((name) => name.length > 0);
  const primaryCategoryName = request.categoryRef?.name ?? request.category;
  const categoryNames = joinedNames.length > 0
    ? joinedNames
    : primaryCategoryName
      ? [primaryCategoryName]
      : [];

  const statusInfo = STATUS_MAP[request.status] || STATUS_MAP.OPEN;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        {categoryNames.map((name) => (
          <Badge key={name} variant="brand">{name}</Badge>
        ))}
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mt-3">{request.title}</h1>
      <div className="mt-3 flex flex-wrap gap-4 text-body-sm text-surface-500">
        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{request.location}</span>
        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{formatRelativeDate(request.createdAt)}</span>
        {request.budget && <span className="flex items-center gap-1.5"><Euro className="h-4 w-4" />{request.budget}</span>}
        {request.deadline && <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{request.deadline}</span>}
      </div>
    </div>
  );
}

export function RequestHeaderSkeleton() {
  return (
    <div className="mb-6">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Skeleton className="h-6 w-24 rounded-lg" />
        <Skeleton className="h-6 w-20 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-9 w-3/4" />
      <div className="mt-3 flex flex-wrap gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
