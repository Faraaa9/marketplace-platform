import type { Metadata } from "next";
import Link from "next/link";
import { SERVICE_CATEGORIES, LITHUANIAN_CITIES, BUDGET_OPTIONS } from "@/lib/constants";
import { formatRelativeDate, truncate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { MapPin, Clock, MessageSquare, ArrowRight, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Viešos užklausos — PaslaugųRinka",
  description:
    "Peržiūrėkite aktyvias paslaugų užklausas Lietuvoje. Raskite darbus ir pateikite pasiūlymus.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ page?: string; category?: string; location?: string }>;
}

export default async function PublicRequestsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const category = params.category || "";
  const location = params.location || "";
  const perPage = 20;

  const where: Record<string, unknown> = { status: "OPEN" };
  if (category) where.category = category;
  if (location) where.location = location;

  const [requests, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        location: true,
        budget: true,
        createdAt: true,
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  const pages = Math.ceil(total / perPage);

  const categoryLabel = (val: string) =>
    SERVICE_CATEGORIES.find((c) => c.value === val)?.label || val;

  const budgetLabel = (val: string) =>
    BUDGET_OPTIONS.find((b) => b.value === val)?.label || val;

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    const newCategory = overrides.category ?? category;
    const newLocation = overrides.location ?? location;
    const newPage = overrides.page ?? "1";
    if (newCategory) p.set("category", newCategory);
    if (newLocation) p.set("location", newLocation);
    if (newPage !== "1") p.set("page", newPage);
    const qs = p.toString();
    return `/uzklausos${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <div className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
            Aktyvios užklausos
          </h1>
          <p className="mt-2 text-body text-surface-500 dark:text-surface-400">
            Peržiūrėkite, ko ieško klientai, ir pateikite savo pasiūlymą.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-surface-400" />
            <span className="text-body-sm text-surface-500">Filtruoti:</span>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildUrl({ category: "", page: "1" })}
              className={`rounded-full px-3 py-1.5 text-caption font-medium transition-colors ${
                !category
                  ? "bg-brand-600 text-white"
                  : "bg-white text-surface-600 border border-surface-200 hover:border-brand-300 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-700"
              }`}
            >
              Visos
            </Link>
            {SERVICE_CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={buildUrl({ category: cat.value, page: "1" })}
                className={`rounded-full px-3 py-1.5 text-caption font-medium transition-colors ${
                  category === cat.value
                    ? "bg-brand-600 text-white"
                    : "bg-white text-surface-600 border border-surface-200 hover:border-brand-300 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-700"
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Location filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="text-body-sm text-surface-500 flex items-center">
            <MapPin className="h-4 w-4 mr-1" /> Miestas:
          </span>
          <Link
            href={buildUrl({ location: "", page: "1" })}
            className={`rounded-full px-3 py-1.5 text-caption font-medium transition-colors ${
              !location
                ? "bg-brand-600 text-white"
                : "bg-white text-surface-600 border border-surface-200 hover:border-brand-300 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-700"
            }`}
          >
            Visi
          </Link>
          {LITHUANIAN_CITIES.map((city) => (
            <Link
              key={city}
              href={buildUrl({ location: city, page: "1" })}
              className={`rounded-full px-3 py-1.5 text-caption font-medium transition-colors ${
                location === city
                  ? "bg-brand-600 text-white"
                  : "bg-white text-surface-600 border border-surface-200 hover:border-brand-300 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-700"
              }`}
            >
              {city}
            </Link>
          ))}
        </div>

        {/* Results count */}
        <p className="text-body-sm text-surface-500 dark:text-surface-400 mb-6">
          {total === 0
            ? "Užklausų nerasta"
            : `Rasta: ${total} ${total === 1 ? "užklausa" : total < 10 ? "užklausos" : "užklausų"}`}
        </p>

        {/* Request cards */}
        {requests.length > 0 ? (
          <div className="grid gap-4">
            {requests.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-surface-200/60 bg-white p-6 transition-all hover:shadow-stripe hover:border-brand-200 dark:border-surface-700/50 dark:bg-surface-900/50 dark:hover:border-brand-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
                      {r.title}
                    </h3>
                    <p className="mt-1.5 text-body-sm text-surface-500 dark:text-surface-400">
                      {truncate(r.description, 150)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-caption text-surface-400">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {categoryLabel(r.category)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {r.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeDate(r.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {r._count.responses}{" "}
                        {r._count.responses === 1
                          ? "pasiūlymas"
                          : r._count.responses < 10
                            ? "pasiūlymai"
                            : "pasiūlymų"}
                      </span>
                    </div>
                  </div>
                  {r.budget && (
                    <div className="text-right shrink-0">
                      <span className="text-body-sm font-semibold text-surface-900 dark:text-white">
                        {budgetLabel(r.budget)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-surface-300 bg-white p-12 text-center dark:border-surface-700 dark:bg-surface-900">
            <p className="text-body text-surface-500 dark:text-surface-400">
              Šiuo metu aktyvių užklausų nėra.
            </p>
            <Link
              href="/uzklausos/nauja"
              className="mt-4 inline-flex items-center text-brand-600 font-medium hover:text-brand-700"
            >
              Pateikti pirmą užklausą
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-body-sm font-medium text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
              >
                Ankstesnis
              </Link>
            )}
            <span className="flex items-center px-3 text-body-sm text-surface-500">
              {page} / {pages}
            </span>
            {page < pages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-body-sm font-medium text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
              >
                Kitas
              </Link>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-body text-surface-500 dark:text-surface-400 mb-4">
            Neradote tinkamos užklausos? Pateikite savo!
          </p>
          <Link
            href="/uzklausos/nauja"
            className="inline-flex items-center rounded-xl bg-brand-600 px-6 py-3 text-body font-semibold text-white shadow-sm hover:bg-brand-700 transition-all"
          >
            Pateikti užklausą
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
