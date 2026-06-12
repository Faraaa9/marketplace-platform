"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserMenuLinks } from "@/lib/redirects";

export default function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!session?.user) return null;

  const email = session.user.email ?? "";
  const name = session.user.name?.trim() || email.split("@")[0] || "Vartotojas";
  const initial = name.charAt(0).toUpperCase();
  const links = getUserMenuLinks(session.user.role);

  return (
    <div ref={ref} className="relative block">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Paskyros meniu"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-200 bg-surface-50/70 transition-colors hover:bg-surface-100 sm:h-auto sm:w-auto sm:gap-2 sm:py-1 sm:pl-1 sm:pr-2.5"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-micro font-semibold text-white sm:h-7 sm:w-7">
          {initial}
        </span>
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-surface-900 sm:block">
          {name}
        </span>
        <ChevronDown
          className={cn("hidden h-4 w-4 text-surface-600 transition-transform sm:block", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-lg shadow-black/5"
        >
          <div className="border-b border-surface-100 px-4 py-3">
            <p className="truncate text-sm font-normal text-surface-900">
              {email || "Paskyra"}
            </p>
          </div>
          <div className="py-1.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center px-4 py-2 text-sm text-surface-900 transition-colors hover:bg-surface-50"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-surface-100 py-1.5">
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="flex min-h-[44px] w-full items-center justify-between px-4 py-2 text-sm text-surface-900 transition-colors hover:bg-surface-50"
            >
              Atsijungti
              <LogOut className="h-4 w-4 text-surface-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
