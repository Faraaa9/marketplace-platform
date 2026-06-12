"use client";

import { SessionProvider } from "next-auth/react";
import BrandThemeProvider from "@/components/layout/BrandThemeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BrandThemeProvider />
      {children}
    </SessionProvider>
  );
}
