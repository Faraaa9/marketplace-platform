"use client";

import { Send } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";

interface ContactButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function ContactButton({ className, children }: ContactButtonProps) {
  const openMessageModal = useUIStore((s) => s.openMessageModal);

  function handleClick() {
    openMessageModal();
    const el = document.getElementById("zinute");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (window.location.hash !== "#zinute") {
      window.location.hash = "#zinute";
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
    >
      {children ?? (
        <>
          <Send className="h-3.5 w-3.5" />
          Rašyti žinutę
        </>
      )}
    </button>
  );
}
