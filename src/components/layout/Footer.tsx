import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-surface-200/50 bg-surface-50 dark:border-surface-800 dark:bg-surface-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-heading-3 tracking-tight text-surface-900 dark:text-white">{APP_NAME}</span>
            </div>
            <p className="text-body-sm text-surface-500 dark:text-surface-400 max-w-xs leading-relaxed">
              Patikima platforma, jungianti paslaugų tiekėjus su klientais visoje Lietuvoje.
            </p>
          </div>

          <div>
            <h4 className="text-caption font-semibold text-surface-900 dark:text-white uppercase tracking-wider mb-4">Platforma</h4>
            <ul className="space-y-2.5">
              <li><FooterLink href="/uzklausos/nauja">Pateikti užklausą</FooterLink></li>
              <li><FooterLink href="/uzklausos">Visos užklausos</FooterLink></li>
              <li><FooterLink href="/tiekejams">Tiekėjams</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="text-caption font-semibold text-surface-900 dark:text-white uppercase tracking-wider mb-4">Informacija</h4>
            <ul className="space-y-2.5">
              <li><FooterLink href="/kontaktai">Kontaktai</FooterLink></li>
              <li><FooterLink href="/privatumas">Privatumo politika</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="text-caption font-semibold text-surface-900 dark:text-white uppercase tracking-wider mb-4">Pradėkite</h4>
            <ul className="space-y-2.5">
              <li><FooterLink href="/registruotis">Registruotis</FooterLink></li>
              <li><FooterLink href="/prisijungti">Prisijungti</FooterLink></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-surface-200/50 dark:border-surface-800">
          <p className="text-center text-micro text-surface-400">
            &copy; {new Date().getFullYear()} {APP_NAME}. Visos teisės saugomos.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-body-sm text-surface-500 hover:text-brand-600 transition-colors duration-200 dark:text-surface-400 dark:hover:text-brand-400">
      {children}
    </Link>
  );
}
