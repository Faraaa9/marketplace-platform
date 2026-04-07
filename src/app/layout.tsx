import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PaslaugųRinka – Paslaugų marketplace",
  description: "Patikima platforma, jungianti paslaugų tiekėjus su klientais visoje Lietuvoje.",
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
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
