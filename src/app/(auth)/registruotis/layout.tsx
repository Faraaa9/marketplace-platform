import type { Metadata } from "next";

// Distinct title so this page no longer shares the root fallback title with
// /prisijungti (was flagged as a duplicate title/meta). Page is noindex via the
// (auth) group layout.
export const metadata: Metadata = {
  title: "Registracija",
  description: "Sukurkite paskyrą ir pradėkite naudotis PaslaugųRinka.",
  // /registruotis?intent=provider is the same page — consolidate it onto the
  // bare URL so the variant doesn't read as duplicate content.
  alternates: { canonical: "/registruotis" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
