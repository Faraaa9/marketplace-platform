import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-surface-200/60 bg-white p-6",
        "shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_8px_-2px_rgba(0,0,0,0.06)]",
        "dark:border-surface-700/50 dark:bg-surface-900/50",
        hover && "transition-all duration-200 hover:shadow-stripe hover:border-surface-300/60 hover:-translate-y-0.5 dark:hover:border-surface-600/50 cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-heading-3 text-surface-900 dark:text-surface-100", className)}>{children}</h3>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-body-sm text-surface-500 dark:text-surface-400", className)}>{children}</div>;
}
