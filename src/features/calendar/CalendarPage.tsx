import SearchableSelect from "@/components/forms/SearchableSelect";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { hasModuleAccess, isActivityAllowedForRole } from "@/lib/rbac";
import PaginatedList from "@/components/common/PaginatedList";
import ListSortControl from "@/components/common/ListSortControl";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import { getAllEnrollments } from "@/features/enrollments/services/enrollment.service";
import { formatBSDate } from "@/utils/nepali-date";
import { getBSCalendarGrid, getKathmanduToday, isValidBSDate } from "@/utils/calendar-date";
import CalendarDayDialog, { type CalendarActivity } from "./CalendarDayDialog";
import { subscribeCalendarMonth, type CalendarMonthData } from "./calendar.service";
import { buildCalendarItems } from "./calendar.utils";
import type { CalendarItem } from "./calendar.types";
import { ensureActivityColors, subscribeActivityColors } from "@/features/activities/services/activity-color.service";
import type { ActivityColors } from "@/features/activities/utils/activity-color";
import CalendarMonthView from "./CalendarMonthView";

const emptyMonth: CalendarMonthData = { records: [], entries: [], loading: true, attendanceError: false, entriesError: false };

function CalendarContent() {
  const { role, activityIds, isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [today, setToday] = useState(getKathmanduToday);
  const requestedMonth = params.get("month") || "";
  const month = isValidBSDate(`${requestedMonth}-01`) ? requestedMonth : today.bs.slice(0, 7);
  const calendar = useMemo(() => getBSCalendarGrid(month), [month]);
  const [result, setResult] = useState({ month: "", data: emptyMonth });
  const data = result.month === month ? result.data : emptyMonth;
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentState, setEnrollmentState] = useState<"loading" | "loaded" | "error">("loading");
  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");
  const [activity, setActivity] = useState("all");
  const [colors, setColors] = useState<ActivityColors>({});
  const [colorError, setColorError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const stop = subscribeActivityColors((palette) => { if (!cancelled) { setColors(palette); setColorError(false); } }, () => { if (!cancelled) setColorError(true); });
    if (isAdmin) void ensureActivityColors().catch(() => { if (!cancelled) setColorError(true); });
    return () => { cancelled = true; stop(); };
  }, [isAdmin]);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(getKathmanduToday()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => subscribeCalendarMonth(calendar.rangeStart, calendar.rangeEnd, (next) => setResult({ month, data: next })), [calendar, month]);
  useEffect(() => {
    let cancelled = false;
    void getAllEnrollments().then((items) => { if (!cancelled) { setEnrollments(items); setEnrollmentState("loaded"); } })
      .catch(() => { if (!cancelled) setEnrollmentState("error"); });
    return () => { cancelled = true; };
  }, []);

  const items = useMemo(() => buildCalendarItems(data.records, data.entries).filter((item) => !item.activityId ||
    isActivityAllowedForRole(role, item.activityName, item.activityCode, activityIds, item.activityId)), [data.records, data.entries, role, activityIds]);
  const activities = useMemo(() => {
    const options = new Map<string, CalendarActivity>();
    for (const item of [...enrollments, ...items]) {
      if (item.activityId && isActivityAllowedForRole(role, item.activityName, item.activityCode, activityIds, item.activityId)) {
        options.set(item.activityId, { id: item.activityId, name: item.activityName || "Activity", code: item.activityCode || "" });
      }
    }
    return [...options.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [enrollments, items, role, activityIds]);
  const filtered = useMemo(() => items.filter((item) => (activity === "all" || item.activityId === activity) &&
    `${item.title} ${item.activityName} ${item.notes}`.toLowerCase().includes(search.trim().toLowerCase())), [items, activity, search]);
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    filtered.forEach((item) => map.set(item.dateBS, [...(map.get(item.dateBS) || []), item]));
    return map;
  }, [filtered]);
  const upcoming = filtered.filter((item) => !item.automatic && item.dateBS >= today.bs && item.dateBS.slice(0, 7) === month);
  const changeMonth = (value: string) => {
    if (!isValidBSDate(`${value}-01`)) return;
    setParams((previous) => { const next = new URLSearchParams(previous); next.set("month", value); return next; });
    setSelectedDate("");
  };

  return <div className="ui-page calendar-page mx-auto w-full min-w-0 space-y-6">
    <h1 className="sr-only">Calendar</h1>
    <div className="flex flex-wrap gap-3">
      <input aria-label="Search calendar entries" placeholder="Search activities or events…" value={search} onChange={(event) => setSearch(event.target.value)} className="ui-field min-w-0 basis-full flex-1 sm:basis-48 px-4" />
      <ListSortControl />
      <SearchableSelect aria-label="Filter calendar by activity" value={activity} onChange={(event) => setActivity(event.target.value)} className="ui-field w-full min-w-0 px-3 sm:w-auto sm:max-w-xs"><option value="all">All activities and events</option>{activities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SearchableSelect>
    </div>
    {data.attendanceError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Some attendance could not be loaded. Class counts may be incomplete. Reload the page to retry.</p>}
    {colorError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Activity colors could not be loaded. Dots are temporarily gray. Reload the page to retry.</p>}
    {data.entriesError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Scheduled events could not be loaded. Attendance classes are still available. Reload the page to retry or contact an administrator.</p>}
    {enrollmentState === "error" && <p role="alert" className="text-sm text-amber-700">Enrollment verification is unavailable. Reload the page to retry.</p>}
    <CalendarMonthView month={month} calendar={calendar} today={today.bs} selectedDate={selectedDate} byDate={byDate} colors={colors} activities={activities} loading={data.loading} onMonthChange={changeMonth} onSelectDate={setSelectedDate} />
    <section className="ui-surface p-4"><h2 className="ui-section-title">Upcoming in the displayed month</h2><p className="mt-1 text-sm text-slate-500">Scheduled entries from today onward. Open a date to add a class, event or holiday.</p>
      {!data.loading && !upcoming.length && <p className="py-5 text-sm text-slate-500">No upcoming entries match the selected month and filters.</p>}
      <PaginatedList items={upcoming} showSort={false} label="Upcoming entries">{(item) => <button key={item.id} type="button" onClick={() => setSelectedDate(item.dateBS)} className="flex w-full flex-wrap justify-between gap-2 border-t border-slate-100 py-3 text-left text-sm hover:bg-slate-50"><span className="font-medium text-slate-800">{item.title}</span><span className="text-slate-500">{formatBSDate(item.dateBS)} BS {item.time && `· ${item.time}`}</span></button>}</PaginatedList>
    </section>
    {selectedDate && calendar.cells.some((day) => day?.bs === selectedDate) && <CalendarDayDialog key={selectedDate} date={selectedDate} today={today.bs} items={byDate.get(selectedDate) || []} colors={colors} activities={activities} enrollments={enrollments} enrollmentsLoaded={enrollmentState === "loaded"} isAdmin={isAdmin} loading={data.loading} attendanceUnavailable={data.attendanceError} entriesUnavailable={data.entriesError} onClose={() => setSelectedDate("")} />}
  </div>;
}

export default function CalendarPage() {
  const { role, permissions } = useAuth();
  return role && hasModuleAccess(role, "attendance", permissions) ? <CalendarContent /> : <Navigate to="/settings" replace />;
}
