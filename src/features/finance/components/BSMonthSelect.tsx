import { useId } from "react";
import { BS_MONTHS } from "@/utils/nepali-date";

export default function BSMonthSelect({ value, onChange, label = "Expected income month (BS)" }: { value: string; onChange: (month: string) => void; label?: string }) {
  const id = useId();
  const [year, month] = value.split("-");
  return (
    <fieldset className="ui-surface max-w-lg p-4">
      <legend className="px-1 text-sm font-medium text-slate-700">{label}</legend>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor={`${id}-month`} className="mb-1.5 block text-sm text-slate-600">Month</label>
          <select id={`${id}-month`} value={month} onChange={(event) => onChange(`${year}-${event.target.value}`)} className="ui-field w-full px-3">
            {BS_MONTHS.map((option) => <option key={option.value} value={option.value}>{option.name}</option>)}
          </select>
        </div>
        <div><label htmlFor={`${id}-year`} className="mb-1.5 block text-sm text-slate-600">Year</label>
          <select id={`${id}-year`} value={year} onChange={(event) => onChange(`${event.target.value}-${month}`)} className="ui-field w-full px-3">
            {Array.from({ length: 31 }, (_, index) => String(2070 + index)).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">Includes the whole month. Recorded attendance is used where available; otherwise session fees use the planned session count.</p>
    </fieldset>
  );
}
