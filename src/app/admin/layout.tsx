"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FileText, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Suvestinė", icon: Home },
  { href: "/admin/tiekėjai", label: "Tiekėjai", icon: Users },
  { href: "/admin/uzklausos", label: "Užklausos", icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-surface-200/50 bg-surface-50 dark:border-surface-800 dark:bg-surface-950 p-4">
        <h2 className="text-heading-3 font-bold text-surface-900 dark:text-white mb-6 px-3">Admin panelė</h2>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                  : "text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-surface-200/50 bg-white/80 backdrop-blur-xl dark:border-surface-800 dark:bg-surface-950/80">
        <div className="flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 text-micro font-medium transition-colors",
                pathname === item.href ? "text-brand-600 dark:text-brand-400" : "text-surface-500"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-16 md:pb-0">{children}</div>
    </div>
  );
}
