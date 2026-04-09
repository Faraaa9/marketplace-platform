"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionType = "single";

interface AccordionContextValue {
  type: AccordionType;
  collapsible?: boolean;
  openValue?: string;
  setOpenValue: (value?: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<{ value: string } | null>(null);

interface AccordionProps {
  children: React.ReactNode;
  type?: AccordionType;
  collapsible?: boolean;
  defaultValue?: string;
  className?: string;
}

export function Accordion({
  children,
  type = "single",
  collapsible = false,
  defaultValue,
  className,
}: AccordionProps) {
  const [openValue, setOpenValueState] = React.useState<string | undefined>(defaultValue);

  function setOpenValue(value?: string) {
    if (type !== "single") return;

    if (value === openValue && collapsible) {
      setOpenValueState(undefined);
      return;
    }

    setOpenValueState(value);
  }

  return (
    <AccordionContext.Provider value={{ type, collapsible, openValue, setOpenValue }}>
      <div className={cn("w-full", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export function AccordionItem({ children, value, className }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div className={cn("border-b border-surface-200/70 dark:border-surface-700/60", className)}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function AccordionTrigger({
  children,
  className,
  ...props
}: AccordionTriggerProps) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  if (!accordion || !item) {
    throw new Error("AccordionTrigger must be used inside AccordionItem");
  }

  const isOpen = accordion.openValue === item.value;

  return (
    <button
      type="button"
      onClick={() => accordion.setOpenValue(item.value)}
      aria-expanded={isOpen}
      className={cn(
        "flex w-full items-center justify-between gap-4 py-4 text-left text-body font-semibold text-surface-900 transition-colors hover:text-brand-600 dark:text-white dark:hover:text-brand-400",
        className
      )}
      {...props}
    >
      <span>{children}</span>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-surface-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </button>
  );
}

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function AccordionContent({
  children,
  className,
  ...props
}: AccordionContentProps) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  if (!accordion || !item) {
    throw new Error("AccordionContent must be used inside AccordionItem");
  }

  const isOpen = accordion.openValue === item.value;

  return (
    <div
      aria-hidden={!isOpen}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      <div className="overflow-hidden">
        <div
          className={cn(
            "pb-4 text-body-sm leading-relaxed text-surface-500 dark:text-surface-400",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
