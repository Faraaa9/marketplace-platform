import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import LoadingProgressBar from "@/components/ui/LoadingProgressBar";
import RegisterSW from "@/components/pwa/RegisterSW";
import InstallPrompt from "@/components/pwa/InstallPrompt";

const inter = localFont({
  src: [
    {
      path: "../../public/fonts/inter-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/inter-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/inter-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/inter-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
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
    <html lang="lt">
      <body className={`${inter.className} min-h-screen flex flex-col bg-surface-50 text-surface-900 dark:bg-surface-950 dark:text-surface-100`}>
        <Providers>
          <Suspense fallback={null}>
            <LoadingProgressBar />
          </Suspense>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <RegisterSW />
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
