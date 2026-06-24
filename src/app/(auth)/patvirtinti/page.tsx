import { Suspense } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import VerifyEmailClient from "./VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <VerifyEmailClient />
    </Suspense>
  );
}
