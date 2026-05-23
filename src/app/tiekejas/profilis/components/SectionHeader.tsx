interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  step?: number;
  totalSteps?: number;
}

export default function SectionHeader({ icon, title, step, totalSteps }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
        {icon}
      </div>
      <h3 className="text-body font-semibold text-surface-900 dark:text-white">{title}</h3>
      {step && (
        <span className="ml-auto text-micro text-surface-300 dark:text-surface-600">{step}/{totalSteps || 4}</span>
      )}
    </div>
  );
}
