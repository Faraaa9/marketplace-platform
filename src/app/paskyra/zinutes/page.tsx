import type { Metadata } from "next";
import { PageHeader } from "@/components/account/ui";
import CustomerInbox from "./CustomerInbox";

export const metadata: Metadata = {
  title: "Žinutės",
  description: "Pokalbiai su meistrais — dėl pasiūlymų ir tiesioginiai klausimai.",
};

// Auth is enforced by src/proxy.ts; the inbox itself loads client-side so the
// page shell prerenders.
export default function CustomerMessagesPage() {
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader title="Žinutės" sub="Visi pokalbiai su meistrais — ir dėl pasiūlymų, ir tiesioginiai klausimai." />
      <CustomerInbox />
    </div>
  );
}
