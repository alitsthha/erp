import { useState, useRef, useEffect } from "react";
import {
  Calendar,
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
  BS_MONTHS,
} from "@/utils/nepali-date";

interface AttendanceDateNavigatorProps {
  selectedDateBS: string;
  onDateChange: (dateBS: string) => void;
  recordedDates?: string[];
  totalRecordsCount?: number;
}

const YEAR_OPTIONS = Array.from({ length: 15 }, (_, index) => 2075 + index); // 2075 to 2089
const DAY_OPTIONS = Array.from({ length: 32 }, (_, index) =>
  String(index + 1).padStart(2, "0")
);

export default function AttendanceDateNavigator({
  selectedDateBS,
  onDateChange,
  recordedDates = [],
  totalRecordsCount = 0,
}: AttendanceDateNavigatorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const todayBS = getCurrentBSDate();
  const isCurrentDay = isTodayBS(selectedDateBS);
  const hasRecordedData = recordedDates.includes(selectedDateBS) || totalRecordsCount > 0;

  const [year = "", month = "", day = ""] = selectedDateBS.split("-");

  // Close calendar popup on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    }

    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen]);

  const handlePreviousDay = () => {
    onDateChange(getPreviousBSDate(selectedDateBS));
  };

  const handleNextDay = () => {
    onDateChange(getNextBSDate(selectedDateBS));
  };

  const handleToday = () => {
    onDateChange(todayBS);
  };

  const handleYearChange = (newYear: string) => {
    if (!newYear) return;
    onDateChange(`${newYear}-${month || "01"}-${day || "01"}`);
  };

  const handleMonthChange = (newMonth: string) => {
    if (!newMonth) return;
    onDateChange(`${year || "2081"}-${newMonth}-${day || "01"}`);
  };

  const handleDayChange = (newDay: string) => {
    if (!newDay) return;
    onDateChange(`${year || "2081"}-${month || "01"}-${newDay}`);
  };

  const selectedMonthObj = BS_MONTHS.find((m) => m.value === month);

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

          {/* Select BS Date Dropdown Toggle */}
          <div className="relative" ref={calendarRef}>
            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
            >
              <Calendar size={15} />
              <span>Choose BS Date</span>
            </button>

            {/* Calendar Popup Dropdown */}
            {isCalendarOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl ring-1 ring-black/5">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Jump to Nepali Date (BS)
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleToday();
                      setIsCalendarOpen(false);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Reset to Today
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      BS Year
                    </label>
                    <select
                      value={year}
                      onChange={(e) => handleYearChange(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    >
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          {y} BS
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      BS Month
                    </label>
                    <select
                      value={month}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    >
                      {BS_MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      BS Day
                    </label>
                    <select
                      value={day}
                      onChange={(e) => handleDayChange(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-500">
                    Selected: {day} {selectedMonthObj?.name} {year}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(false)}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-slate-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
