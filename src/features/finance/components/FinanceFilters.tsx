import { Filter } from "lucide-react";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";

interface FinanceFiltersProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function FinanceFilters({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onApply,
  onReset,
}: FinanceFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-slate-100 p-2">
          <Filter size={17} className="text-slate-600" />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Financial Period
          </h2>

          <p className="text-xs text-slate-500">
            Filter income, expenses and transactions by date.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            From Date
          </label>

          <NepaliDatePickerInput value={fromDate} onChange={onFromDateChange} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            To Date
          </label>

          <NepaliDatePickerInput value={toDate} onChange={onToDateChange} />
        </div>

        <button
          type="button"
          onClick={onApply}
          className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Apply Filter
        </button>

        <button
          type="button"
          onClick={onReset}
          className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
}