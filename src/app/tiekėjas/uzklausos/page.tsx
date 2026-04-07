"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SERVICE_CATEGORIES, LITHUANIAN_CITIES, BUDGET_OPTIONS } from "@/lib/constants";
import { formatRelativeDate, truncate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import { MapPin, Clock, Euro, MessageCircle, FileText } from "lucide-react";

interface Request {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  budget?: string;
  createdAt: string;
  _count: { responses: number };
}

export default function ProviderRequestsPage() {
  return <Suspense fallback={<LoadingSpinner />}><ProviderRequestsContent /></Suspense>;
}

function ProviderRequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const page = parseInt(searchParams.get("page") || "1");
  const category = searchParams.get("category") || "";
  const location = searchParams.get("location") || "";

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (category) params.set("category", category);
    if (location) params.set("location", location);

    fetch(`/api/tiekėjas/uzklausos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setRequests(data.data.requests);
          setTotal(data.data.total);
          setPages(data.data.pages);
        }
      })
      .finally(() => setLoading(false));
  }, [page, category, location]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/tiekėjas/uzklausos?${params}`);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-6">Užklausos ({total})</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Select
          options={SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          placeholder="Visos kategorijos"
          value={category}
          onChange={(e) => updateFilter("category", e.target.value)}
        />
        <Select
          options={LITHUANIAN_CITIES.map((c) => ({ value: c, label: c }))}
          placeholder="Visi miestai"
          value={location}
          onChange={(e) => updateFilter("location", e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : requests.length === 0 ? (
        <EmptyState title="Užklausų nerasta" description="Pabandykite pakeisti filtrus." icon={<FileText className="h-12 w-12" />} />
      ) : (
        <>
          <div className="space-y-3">
            {requests.map((req) => {
              const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === req.category)?.label;
              const budgetLabel = BUDGET_OPTIONS.find((b) => b.value === req.budget)?.label;
              return (
                <Link key={req.id} href={`/tiekėjas/uzklausos/${req.id}`}>
                  <Card hover className="mb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-medium text-surface-900 dark:text-white">{req.title}</p>
                        <p className="text-body-sm text-surface-500 mt-1 line-clamp-2">{truncate(req.description, 150)}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-micro text-surface-400">
                          <span className="flex items-center gap-1"><Badge>{categoryLabel}</Badge></span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.location}</span>
                          {budgetLabel && <span className="flex items-center gap-1"><Euro className="h-3 w-3" />{budgetLabel}</span>}
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelativeDate(req.createdAt)}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{req._count.responses} atsakymų</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={pages} onPageChange={(p) => updateFilter("page", String(p))} className="mt-6" />
        </>
      )}
    </div>
  );
}
