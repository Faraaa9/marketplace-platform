import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "brand";
  className?: string;
}

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    danger: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    info: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-micro font-medium tracking-tight",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
