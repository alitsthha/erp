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
    <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Left: Date Display & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
            <CalendarDays size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Nepali Date (BS Calendar)
              </span>

              {isCurrentDay ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  Today
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  Historical Date
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
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {formatBSDate(selectedDateBS, "full")}
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
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            title="Previous Day"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous Day</span>
          </button>

          {/* Today Button */}
          <button
            type="button"
            onClick={handleToday}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold shadow-sm transition ${
              isCurrentDay
                ? "bg-blue-600 text-white hover:bg-blue-700"
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
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            title="Next Day"
          >
            <span className="hidden sm:inline">Next Day</span>
            <ChevronRight size={16} />
          </button>

          <div className="w-full min-w-64 sm:w-72">
            <NepaliDatePickerInput value={selectedDateBS} onChange={onDateChange} />
          </div>

        </div>
      </div>
    </div>
  );
}
