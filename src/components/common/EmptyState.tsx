import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
      {Icon && <Icon size={48} className="mb-4 text-slate-400" />}
      <h2 className="ui-section-title">{title}</h2>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="ui-button mt-4 bg-brand-600 py-2 text-white hover:bg-brand-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
