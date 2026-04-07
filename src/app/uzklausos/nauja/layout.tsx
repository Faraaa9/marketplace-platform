import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nauja užklausa – Gaukite pasiūlymus",
  description: "Pateikite nemokamą užklausą ir gaukite pasiūlymus iš patikrintų paslaugų tiekėjų Lietuvoje.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
