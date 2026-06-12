import { Suspense } from "react";
import ProviderInboxClient from "./ProviderInboxClient";
import CreatedToast from "@/components/ui/CreatedToast";

interface PageProps {
  searchParams: Promise<{ created?: string }>;
}

// The inbox shell prerenders; the post-publish toast depends on the search
// param, so it resolves inside its own boundary without blocking the page.
export default function ProviderInboxPage({ searchParams }: PageProps) {
  return (
    <>
      <Suspense fallback={null}>
        <CreatedToastGate searchParams={searchParams} />
      </Suspense>
      <ProviderInboxClient />
    </>
  );
}

async function CreatedToastGate({ searchParams }: PageProps) {
  const { created } = await searchParams;
  return created === "1" ? <CreatedToast /> : null;
}
