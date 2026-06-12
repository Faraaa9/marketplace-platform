"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { getBrandPalette, normalizeBrandColor } from "@/lib/brand-theme";

function applyBrandColor(value?: string | null) {
  const color = normalizeBrandColor(value);
  const palette = getBrandPalette(color);
  const root = document.documentElement;

  root.dataset.brandColor = color;
  for (const [step, rgb] of Object.entries(palette.vars)) {
    root.style.setProperty(`--brand-${step}`, rgb);
  }
  root.style.setProperty("--brand", `rgb(${palette.vars["500"]})`);
  root.style.setProperty("--brand-light", `rgb(${palette.vars["50"]})`);
  root.style.setProperty("--brand-main", palette.main);
  root.style.setProperty("--brand-main-hover", palette.hover);
  root.style.setProperty("--brand-main-shadow", palette.shadow);
}

export default function BrandThemeProvider() {
  const { data: session } = useSession();

  useEffect(() => {
    applyBrandColor(session?.user?.brandColor);
  }, [session?.user?.brandColor]);

  return null;
}
