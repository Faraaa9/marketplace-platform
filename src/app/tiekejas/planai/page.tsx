import { Suspense } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CreditsClient from "./CreditsClient";

export default function CreditsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CreditsClient />
    </Suspense>
  );
}
