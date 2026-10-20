import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";
import type { FinanceDateFilter } from "../types/finance.types";

export default function FinanceDateRange({ value, onChange, description }: {
  value: FinanceDateFilter;
  description?: string;
  onChange: (value: FinanceDateFilter) => void;
}) {
  const invalid = !!(value.startDate && value.endDate && value.startDate > value.endDate);
  return (
    <div className="ui-surface mb-6 space-y-3 p-4">
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <NepaliDatePickerInput label="From date (BS)" value={value.startDate ?? ""} onChange={(startDate) => onChange({ ...value, startDate })} required helperText={description ? undefined : "Leave empty for all earlier dates."} />
        <NepaliDatePickerInput label="To date (BS)" value={value.endDate ?? ""} onChange={(endDate) => onChange({ ...value, endDate })} required helperText={description ? undefined : "Includes the entire selected day."} />
        <button type="button" className="ui-button border border-slate-200 text-slate-700" onClick={() => onChange({})}>Clear dates</button>
      </div>
      {invalid ? <p role="alert" className="text-sm text-red-600">From date must be on or before to date.</p> : <p className="text-xs text-slate-500">{description ?? (value.startDate || value.endDate ? "Showing data within the selected date range." : "Showing all dates.")}</p>}
    </div>
  );
}
