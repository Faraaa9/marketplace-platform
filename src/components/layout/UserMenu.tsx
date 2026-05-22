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
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-[#CFC9BC] bg-[#F2EFE8]/70 py-1 pl-1 pr-2.5 transition-colors hover:bg-[#E9E4D9]"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#C25E3A] text-[12px] font-semibold text-white">
          {initial}
        </span>
        <span className="max-w-[140px] truncate text-sm font-medium text-[#26231F]">
          {name}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-[#57534C] transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-[#DBD6CB] bg-white shadow-lg shadow-black/5"
        >
          <div className="border-b border-[#EAE6DD] px-4 py-3">
            <p className="truncate text-sm font-normal text-[#26231F]">
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
                className="block px-4 py-2 text-sm text-[#26231F] transition-colors hover:bg-[#F2EFE8]"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-[#EAE6DD] py-1.5">
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="flex w-full items-center justify-between px-4 py-2 text-sm text-[#26231F] transition-colors hover:bg-[#F2EFE8]"
            >
              Atsijungti
              <LogOut className="h-4 w-4 text-[#57534C]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
