import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CalendarDays,
} from "lucide-react";
import {
  getCurrentBSDate,
  getPreviousBSDate,
  getNextBSDate,
  formatBSDate,
  isTodayBS,
  getBSWeekday,
} from "@/utils/nepali-date";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";

interface AttendanceDateNavigatorProps {
  selectedDateBS: string;
  onDateChange: (dateBS: string) => void;
  recordedDates?: string[];
  totalRecordsCount?: number;
}

export default function AttendanceDateNavigator({
  selectedDateBS,
  onDateChange,
  recordedDates = [],
  totalRecordsCount = 0,
}: AttendanceDateNavigatorProps) {
  const todayBS = getCurrentBSDate();
  const isCurrentDay = isTodayBS(selectedDateBS);
  const hasRecordedData = recordedDates.includes(selectedDateBS) || totalRecordsCount > 0;

  const handlePreviousDay = () => {
    onDateChange(getPreviousBSDate(selectedDateBS));
  };

  const handleNextDay = () => {
    onDateChange(getNextBSDate(selectedDateBS));
  };

  const handleToday = () => {
    onDateChange(todayBS);
  };

  return (
    <div className="ui-surface relative p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        
        {/* Left: Date Display & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <CalendarDays size={20} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                Nepali date · BS
              </span>

              {isCurrentDay ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
                  Today
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  Selected date
                </span>
              )}

              {hasRecordedData ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  ● Recorded ({totalRecordsCount})
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  ○ No Entry Yet
                </span>
              )}
            </div>

            <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
              <h2 className="ui-section-title tracking-tight">
                {formatBSDate(selectedDateBS, "full")} · {getBSWeekday(selectedDateBS)}
              </h2>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-semibold text-slate-600">
                {selectedDateBS} BS
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Navigation & Date Picker */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Previous Day Button */}
          <button
            type="button"
            onClick={handlePreviousDay}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            title="Previous Day"
            aria-label="Previous day"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Today Button */}
          <button
            type="button"
            onClick={handleToday}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition ${
              isCurrentDay
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <RotateCcw size={14} />
            Today
          </button>

          {/* Next Day Button */}
          <button
            type="button"
            onClick={handleNextDay}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            title="Next Day"
            aria-label="Next day"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} />
          </button>

          <div className="w-full min-w-0 sm:w-52">
            <NepaliDatePickerInput value={selectedDateBS} onChange={onDateChange} />
          </div>

        </div>
      </div>
    </div>
  );
}
