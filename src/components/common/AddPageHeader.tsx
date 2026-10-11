import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  onBack?: () => void;
}

export default function PageHeader({
  title,
  description,
  badge = "ERP Management",
  onBack,
}: PageHeaderProps) {
  return (
    <div className="mb-6 text-slate-900">
      <div className="mb-3 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-lg bg-brand-50 p-2 text-brand-700 transition hover:bg-brand-100"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          {badge}
        </div>
      </div>

      <h1 className="ui-page-title">
        {title}
      </h1>

      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}