import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="mb-4 text-surface-400 dark:text-surface-500">
        {icon || <Inbox className="h-12 w-12" />}
      </div>
      <h3 className="text-lg font-medium text-surface-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
