import type { Metadata } from "next";
import { PageHeader } from "@/components/account/ui";
import ProviderInboxClient from "./ProviderInboxClient";

export const metadata: Metadata = { title: "Žinutės" };

export default function ProviderInboxPage() {
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader title="Žinutės" sub="Pokalbiai su klientais. Prie kiekvieno — užklausos santrauka." />
      <ProviderInboxClient />
    </div>
  );
}
