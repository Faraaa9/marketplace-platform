"use client";

import { useMemo } from "react";
import { useParams, usePathname } from "next/navigation";
import {
  SpeedInsights as ReactSpeedInsights,
  computeRoute,
} from "@vercel/speed-insights/react";

export default function SpeedInsights() {
  const pathname = usePathname();
  const params = useParams();
  const route = useMemo(() => {
    return computeRoute(
      pathname,
      params as Record<string, string | string[]> | null,
    );
  }, [params, pathname]);

  return (
    <ReactSpeedInsights
      route={route}
      framework="next"
      basePath={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH}
      configString={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG}
    />
  );
}
