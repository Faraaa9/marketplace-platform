import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nauja užklausa – Gaukite pasiūlymus",
  description: "Pateikite nemokamą užklausą ir gaukite pasiūlymus iš patikrintų paslaugų tiekėjų Lietuvoje.",
  // Utility form page: landing-page CTAs link here with prefill query params
  // (?title=&category=&...), which the crawler sees as many near-duplicate
  // pages (duplicate title/content/meta). Keep it out of the index; the
  // landing pages are the indexed assets that funnel here.
  robots: { index: false, follow: true },
  // Consolidate every prefill variant onto the bare URL so the duplicate
  // content collapses to a single canonical page (belt-and-suspenders with
  // noindex above).
  alternates: { canonical: "/uzklausos/nauja" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
