import type { Metadata } from "next";

// Auth flows (login, register, password reset, confirm) are not content pages —
// keep them out of the index. Without this they fell back to the root layout
// title/description, producing duplicate-title and duplicate-meta issues across
// /prisijungti, /registruotis and /registruotis?intent=provider.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
