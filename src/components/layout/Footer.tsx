import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function Footer() {
  // Transparent everywhere so the site-wide grid background flows through.
  return (
    <footer className="border-t border-[#DBD6CB]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className="grid h-8 w-8 place-items-center bg-[#C25E3A] text-[13px] font-bold text-white"
                style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
              >
                P
              </span>
              <span className="text-[17px] font-semibold tracking-tight text-[#26231F]">
                {APP_NAME}
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-[#6B6760]">
              Patikima platforma, jungianti paslaugų tiekėjus su klientais visoje Lietuvoje.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#26231F]">
              Platforma
            </h4>
            <ul className="space-y-2.5">
              <li><FooterLink href="/uzklausos/nauja">Pateikti užklausą</FooterLink></li>
              <li><FooterLink href="/uzklausos">Visos užklausos</FooterLink></li>
              <li><FooterLink href="/tiekejams">Tiekėjams</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#26231F]">
              Informacija
            </h4>
            <ul className="space-y-2.5">
              <li><FooterLink href="/kontaktai">Kontaktai</FooterLink></li>
              <li><FooterLink href="/privatumas">Privatumo politika</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#26231F]">
              Pradėkite
            </h4>
            <ul className="space-y-2.5">
              <li><FooterLink href="/registruotis">Registruotis</FooterLink></li>
              <li><FooterLink href="/prisijungti">Prisijungti</FooterLink></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[#DBD6CB] pt-6">
          <p className="text-center text-xs text-[#8C877D]">
            &copy; {new Date().getFullYear()} {APP_NAME}. Visos teisės saugomos.
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
      className="text-sm text-[#6B6760] transition-colors duration-200 hover:text-[#C25E3A]"
    >
      {children}
    </Link>
  );
}
