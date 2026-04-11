"use client";

import dynamic from "next/dynamic";

export const LazyParticles = dynamic(
  () => import("./particles").then((m) => m.Particles),
  { ssr: false }
);

export const LazyNumberTicker = dynamic(
  () => import("./number-ticker").then((m) => m.NumberTicker),
  { ssr: false, loading: () => <span className="tabular-nums">0</span> }
);
