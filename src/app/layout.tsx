import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import LoadingProgressBar from "@/components/ui/LoadingProgressBar";
import RegisterSW from "@/components/pwa/RegisterSW";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";

// Inter via next/font/google with the latin-ext subset so Lithuanian glyphs
// (ą č ę ė į š ų ū ž) render in Inter itself. The previous local build shipped
// only the `latin` subset, so those characters fell back to the system font —
// visibly mismatched. next/font self-hosts the files at build time (no runtime
// request), so this keeps the same performance profile.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

const lora = Lora({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: {
    default: "PaslaugųRinka – Paslaugų marketplace Lietuvoje",
    template: "%s | PaslaugųRinka",
  },
  description: "Patikima platforma, jungianti paslaugų tiekėjus su klientais visoje Lietuvoje. Raskite geriausius specialistus arba pritraukite naujų klientų.",
  keywords: ["paslaugos", "marketplace", "Lietuva", "tiekėjai", "klientai", "remontas", "valymas", "statyba"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PaslaugųRinka",
  },
  openGraph: {
    type: "website",
    locale: "lt_LT",
    siteName: "PaslaugųRinka",
    title: "PaslaugųRinka – Paslaugų marketplace Lietuvoje",
    description: "Patikima platforma, jungianti paslaugų tiekėjus su klientais visoje Lietuvoje.",
  },
  robots: {
    index: true,
    follow: true,
  },
  // Google Search Console ownership — renders
  // <meta name="google-site-verification" content="…"> when the env is set.
  // Omitted entirely when unset, so no empty tag ships.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="lt" suppressHydrationWarning>
      <body className={`${inter.className} ${lora.variable} min-h-screen flex flex-col text-surface-900 dark:text-surface-100`}>
        {/* Applies the saved theme before paint so dark mode never flashes light */}
        <script src="/theme-init.js" async />
        {/* Site-wide fixed grid background — identical on every page, constant on scroll; dark-aware via .layout-grid */}
        <div aria-hidden className="layout-grid fixed inset-0 -z-10" />
        <Providers>
          <Suspense fallback={null}>
            <LoadingProgressBar />
          </Suspense>
          {/* Client components below read session/path — each wrapped in
              Suspense so Cache Components can prerender the layout shell. */}
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
          <Footer />
          <Suspense fallback={null}>
            <MobileBottomNav />
          </Suspense>
          <RegisterSW />
          <InstallPrompt />
          {/* useSearchParams inside requires a Suspense boundary */}
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
