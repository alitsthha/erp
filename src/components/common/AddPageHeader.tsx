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
    <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-lg sm:p-8">
      <div className="mb-4 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100">
          {badge}
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h1>

      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}