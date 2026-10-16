import SearchableSelect from "@/components/forms/SearchableSelect";
import { useRef } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { BS_MONTHS, formatBSDate } from "@/utils/nepali-date";
import { formatADMonthRange, getBSCalendarGrid, isValidBSDate, shiftBSMonth } from "@/utils/calendar-date";
import type { ActivityColors } from "@/features/activities/utils/activity-color";
import type { CalendarItem } from "./calendar.types";
import CalendarActivityDots from "./CalendarActivityDots";
import CalendarActivityLegend from "./CalendarActivityLegend";
import "./calendar.css";

interface Props {
  month: string;
  calendar: ReturnType<typeof getBSCalendarGrid>;
  today: string;
  selectedDate: string;
  byDate: Map<string, CalendarItem[]>;
  colors: ActivityColors;
  activities?: { id: string; name: string }[];
  legendItems?: CalendarItem[];
  selectedActivity?: string;
  onActivityChange?: (activityId: string) => void;
  loading: boolean;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
}

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function CalendarMonthView({ month, calendar, today, selectedDate, byDate, colors, activities = [], legendItems, selectedActivity = "all", onActivityChange, loading, onMonthChange, onSelectDate }: Props) {
  const picker = useRef<HTMLDetailsElement>(null);
  const name = BS_MONTHS[Number(month.slice(-2)) - 1].name;
  const chooseMonth = (value: string) => {
    if (!isValidBSDate(`${value}-01`)) return;
    onMonthChange(value);
    if (picker.current) picker.current.open = false;
  };
  return <section aria-label="Nepali monthly calendar" aria-busy={loading} className="activity-calendar">
    <div className="calendar-month-header">
      <div className="calendar-month-heading">
        <details ref={picker} className="calendar-month-picker">
          <summary aria-label="Choose Nepali month and year"><h2 aria-label={`${name} ${month.slice(0, 4)} BS`}>{name} {month.slice(0, 4)}</h2><ChevronDown size={20} aria-hidden="true" /></summary>
          <div className="calendar-month-options">
            <label>Month<SearchableSelect aria-label="Nepali month" value={month.slice(-2)} onChange={(event) => chooseMonth(`${month.slice(0, 4)}-${event.target.value}`)}>{BS_MONTHS.map((item) => <option key={item.value} value={item.value}>{item.name}</option>)}</SearchableSelect></label>
            <label>Year<input key={month.slice(0, 4)} aria-label="Nepali year" type="number" defaultValue={Number(month.slice(0, 4))} onBlur={(event) => {
              const value = `${event.target.value}-${month.slice(-2)}`;
              if (isValidBSDate(`${value}-01`)) chooseMonth(value);
              else event.target.value = month.slice(0, 4);
            }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>
          </div>
        </details>
        <p className="calendar-english-range">{name} · {formatADMonthRange(calendar.days[0].ad, calendar.days.at(-1)!.ad)}</p>
      </div>
      <div className="calendar-month-controls">
        <button type="button" className="calendar-today" onClick={() => chooseMonth(today.slice(0, 7))}>Today</button>
        <button type="button" aria-label="Previous month" disabled={!isValidBSDate(`${shiftBSMonth(month, -1)}-01`)} onClick={() => chooseMonth(shiftBSMonth(month, -1))} className="calendar-month-arrow"><ChevronLeft aria-hidden="true" /></button>
        <button type="button" aria-label="Next month" disabled={!isValidBSDate(`${shiftBSMonth(month, 1)}-01`)} onClick={() => chooseMonth(shiftBSMonth(month, 1))} className="calendar-month-arrow"><ChevronRight aria-hidden="true" /></button>
      </div>
    </div>
    <p className="sr-only">Nepali dates are centered. English dates are in each cell's top right. Click a date to view its activities and attendance.</p>
    {loading && <p role="status" className="calendar-loading">Loading calendar…</p>}
    <div className="calendar-weekdays">{weekdays.map((day, index) => <div key={day} aria-label={day} className={index === 0 || index === 6 ? "calendar-weekend" : ""}>{day.slice(0, 3)}</div>)}</div>
    <div className="calendar-date-grid">{calendar.cells.map((day, index) => {
      if (!day) return <div key={`unsupported-${index}`} aria-hidden="true" className="calendar-date" />;
      const dayItems = byDate.get(day.bs) || [];
      const names = [...new Set(dayItems.map((item) => item.activityName || item.title))].join(", ");
      const weekend = index % 7 === 0 || index % 7 === 6;
      const holiday = dayItems.some((item) => item.type === "holiday");
      return <button key={day.bs} type="button" data-date-bs={day.bs} aria-label={`${formatBSDate(day.bs)} BS, ${day.ad} AD, ${dayItems.length} entries${names ? `: ${names}` : ""}`}
        aria-current={day.bs === today ? "date" : undefined} onClick={() => onSelectDate(day.bs)}
        className={`calendar-date${weekend || holiday ? " calendar-weekend" : ""}${!day.inMonth ? " calendar-adjacent-date" : ""}${day.bs === today || day.bs === selectedDate ? " calendar-highlight-date" : ""}`}>
        <span className="calendar-ad-day" aria-hidden="true">{Number(day.ad.slice(-2))}</span>
        <span className="calendar-bs-day" aria-hidden="true">{day.day}</span>
        <CalendarActivityDots items={dayItems} colors={colors} />
      </button>;
    })}</div>
    <CalendarActivityLegend activities={activities} colors={colors} month={month} items={legendItems ?? [...byDate.values()].flat()} selectedActivity={selectedActivity} onActivityChange={onActivityChange} loading={loading} />
  </section>;
}
