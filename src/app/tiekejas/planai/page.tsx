import type { Metadata } from "next";
import { Suspense } from "react";
import CreditsClient from "./CreditsClient";

export const metadata: Metadata = { title: "Kreditai ir sąskaitos" };

// Stripe checkout returns here (?success / ?canceled), so the route stays
// /tiekejas/planai. CreditsClient reads search params → needs a boundary.
export default function CreditsPage() {
  return (
    <Suspense fallback={null}>
      <CreditsClient />
    </Suspense>
  );
}
