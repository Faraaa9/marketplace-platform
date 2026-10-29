import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/account/ui";
import CreatedToast from "@/components/ui/CreatedToast";
import ProviderInboxClient from "./ProviderInboxClient";

export const metadata: Metadata = { title: "Žinutės" };

interface PageProps {
  searchParams: Promise<{ created?: string }>;
}

// The inbox shell prerenders; the post-publish toast depends on the search
// param, so it resolves inside its own boundary without blocking the page.
export default function ProviderInboxPage({ searchParams }: PageProps) {
  return (
    <div className="flex flex-col gap-[18px]">
      <Suspense fallback={null}>
        <CreatedToastGate searchParams={searchParams} />
      </Suspense>
      <PageHeader title="Žinutės" sub="Pokalbiai su klientais. Prie kiekvieno — užklausos santrauka." />
      <ProviderInboxClient />
    </div>
  );
}

async function CreatedToastGate({ searchParams }: PageProps) {
  const { created } = await searchParams;
  return created === "1" ? <CreatedToast /> : null;
}
