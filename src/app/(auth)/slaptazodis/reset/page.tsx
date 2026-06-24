import { Suspense } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
