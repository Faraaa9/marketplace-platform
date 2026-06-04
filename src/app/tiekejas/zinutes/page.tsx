import { Suspense } from "react";
import { SessionGate } from "@/components/auth/SessionGate";
import ProviderInboxClient from "./ProviderInboxClient";

export default function ProviderInboxPage() {
  return (
    <Suspense fallback={null}>
      <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas/zinutes">
        {() => <ProviderInboxClient />}
      </SessionGate>
    </Suspense>
  );
}
