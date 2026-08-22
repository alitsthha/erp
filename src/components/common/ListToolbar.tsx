import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  filter?: ReactNode;
  onClear?: () => void;
}

export default function ListToolbar({ search, onSearchChange, placeholder = "Search records...", resultCount, filter, onClear }: ListToolbarProps) {
  const hasFilters = Boolean(search) || Boolean(filter);

  return (
    <div className="border-b border-slate-200 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search list</span>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </label>
        {filter && <div className="flex items-center gap-2"><SlidersHorizontal size={16} className="text-slate-400" />{filter}</div>}
        {onClear && hasFilters && <button type="button" onClick={onClear} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><RotateCcw size={15} /> Clear</button>}
      </div>
      {resultCount !== undefined && <p className="mt-3 text-xs text-slate-500">Showing {resultCount} matching records</p>}
    </div>
  );
}
