"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/constants";

// Captured at module load (= build time). Cache Components forbids
// `new Date()` during render in server components. Module scope is
// fine because the value is baked into the build. Redeploy at year
// boundary to refresh.
const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  const pathname = usePathname() ?? "/";
  if (pathname === "/tiekejas/zinutes" || pathname.startsWith("/tiekejas/zinutes/")) {
    return null;
  }

  // Transparent everywhere so the site-wide grid background flows through.
  return (
    <footer className="border-t border-[#DBD6CB] dark:border-surface-800">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <div className="md:col-span-1">
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className="grid h-8 w-8 place-items-center bg-[#C25E3A] text-[13px] font-bold text-white"
                style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
              >
                P
              </span>
              <span className="text-[17px] font-semibold tracking-tight text-[#26231F] dark:text-surface-50">
                {APP_NAME}
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-[#6B6760] dark:text-surface-400">
              Patikima platforma, jungianti paslaugų tiekėjus su klientais visoje Lietuvoje.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#26231F] dark:text-surface-100">
              Platforma
            </h4>
            <ul className="space-y-2.5">
              <li><FooterLink href="/uzklausos/nauja">Pateikti užklausą</FooterLink></li>
              <li><FooterLink href="/uzklausos">Visos užklausos</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#26231F] dark:text-surface-100">
              Populiarios paslaugos
            </h4>
            <ul className="space-y-2.5">
              <li><FooterLink href="/paslaugos/elektrikas-kaune">Elektrikas Kaune</FooterLink></li>
              <li><FooterLink href="/paslaugos/santechnikas-kaune">Santechnikas Kaune</FooterLink></li>
              <li><FooterLink href="/paslaugos/stogo-dengimas-kaune">Stogo dengimas Kaune</FooterLink></li>
              <li><FooterLink href="/paslaugos/kondicionieriu-montavimas-kaune">Kondicionierių montavimas Kaune</FooterLink></li>
              <li><FooterLink href="/paslaugos/apdailos-darbai-kaune">Apdailos darbai Kaune</FooterLink></li>
              <li><FooterLink href="/paslaugos">Visos paslaugos</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#26231F] dark:text-surface-100">
              Straipsniai
            </h4>
            <ul className="space-y-2.5">
              <li><FooterLink href="/straipsniai/stogo-darbai">Stogo darbai</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#26231F] dark:text-surface-100">
              Informacija
            </h4>
            <ul className="space-y-2.5">
              <li><FooterLink href="/kontaktai">Kontaktai</FooterLink></li>
              <li><FooterLink href="/privatumas">Privatumo politika</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#26231F] dark:text-surface-100">
              Pradėkite
            </h4>
            <ul className="space-y-2.5">
              <li><FooterLink href="/tiekejams">Tapti meistru</FooterLink></li>
              <li><FooterLink href="/registruotis">Registruotis</FooterLink></li>
              <li><FooterLink href="/prisijungti">Prisijungti</FooterLink></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[#DBD6CB] pt-6 dark:border-surface-800">
          <p className="text-center text-xs text-[#8C877D] dark:text-surface-500">
            &copy; {CURRENT_YEAR} {APP_NAME}. Visos teisės saugomos.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-[#6B6760] transition-colors duration-200 hover:text-[#C25E3A] dark:text-surface-400 dark:hover:text-brand-400"
    >
      {children}
    </Link>
  );
}
