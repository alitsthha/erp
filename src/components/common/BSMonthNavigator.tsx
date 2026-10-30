import { ChevronLeft, ChevronRight } from "lucide-react";
import { BS_MONTHS } from "@/utils/nepali-date";
import { isValidBSDate, shiftBSMonth } from "@/utils/calendar-date";

export default function BSMonthNavigator({ month, currentMonth, onChange }: {
  month: string; currentMonth: string; onChange: (month: string) => void;
}) {
  const [year, number] = month.split("-");
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
    <button type="button" className="ui-button" aria-label="Previous Nepali month"
      disabled={!isValidBSDate(`${shiftBSMonth(month, -1)}-01`)} onClick={() => onChange(shiftBSMonth(month, -1))}><ChevronLeft size={18} /></button>
    <span aria-live="polite" className="font-semibold">{BS_MONTHS.find((item) => item.value === number)?.name} {year} BS</span>
    <button type="button" className="ui-button" aria-label="Next Nepali month"
      disabled={!isValidBSDate(`${shiftBSMonth(month, 1)}-01`)} onClick={() => onChange(shiftBSMonth(month, 1))}><ChevronRight size={18} /></button>
    <button type="button" className="ui-button text-brand-700" onClick={() => onChange(currentMonth)}>Current month</button>
    <span className="text-xs text-slate-500">Attendance counted from the first to the last day of this Nepali month.</span>
  </div>;
}
