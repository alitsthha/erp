import SafeForm from "@/components/forms/SafeForm";
import SearchableSelect from "@/components/forms/SearchableSelect";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import PaginatedList from "@/components/common/PaginatedList";
import { attendanceLink } from "@/features/attendance/utils/attendance-navigation";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import { convertBSToAD, formatBSDate, getBSWeekday } from "@/utils/nepali-date";
import { createCalendarEntry, deleteCalendarEntry } from "./calendar.service";
import type { CalendarEntryType, CalendarItem } from "./calendar.types";
import type { ActivityColors } from "@/features/activities/utils/activity-color";
import { verifyClass } from "./calendar.utils";

export interface CalendarActivity { id: string; name: string; code: string }
interface Props {
  date: string;
  today: string;
  items: CalendarItem[];
  colors?: ActivityColors;
  activities: CalendarActivity[];
  enrollments: Enrollment[];
  enrollmentsLoaded: boolean;
  isAdmin: boolean;
  loading: boolean;
  entriesUnavailable: boolean;
  attendanceUnavailable: boolean;
  onClose: () => void;
}

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

export default function CalendarDayDialog({ date, today, items, colors = {}, activities, enrollments, enrollmentsLoaded, isAdmin, loading, entriesUnavailable, attendanceUnavailable, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<CalendarEntryType>("class");
  const [activityId, setActivityId] = useState("");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState("");

  useEffect(() => { dialog.current?.showModal(); }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const activity = activities.find((item) => item.id === activityId);
    setBusy(true);
    setError("");
    try {
      await createCalendarEntry({ dateBS: date, type, title: type === "class" ? activity?.name || "" : title,
        activityId: type === "class" ? activityId : "", activityName: type === "class" ? activity?.name || "" : "",
        activityCode: type === "class" ? activity?.code || "" : "", time, notes });
      setAdding(false);
      setTitle(""); setNotes(""); setTime("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this entry. Please try again."); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    setBusy(true); setError("");
    try { await deleteCalendarEntry(id); setRemoving(""); }
    catch { setError("Could not remove this entry. Please try again."); }
    finally { setBusy(false); }
  };

  return <dialog ref={dialog} aria-labelledby="calendar-day-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    className="calendar-day-dialog fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl backdrop:bg-slate-950/40 sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div><h2 id="calendar-day-title" className="ui-section-title">{formatBSDate(date)} BS</h2>
        <p className="mt-1 text-sm text-slate-500">{getBSWeekday(date)} · {convertBSToAD(date)} AD</p></div>
      <button type="button" disabled={busy} onClick={onClose} aria-label="Close calendar date" className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {entriesUnavailable && <p className="mt-4 text-sm text-amber-700">Scheduled entries could not be loaded. Attendance classes are still shown when available.</p>}
    {attendanceUnavailable && <p role="alert" className="mt-4 text-sm text-red-700">Some attendance could not be loaded. The classes and counts below may be incomplete.</p>}
    {loading ? <p role="status" className="py-8 text-slate-500">Loading this date…</p> : <div className="mt-5 space-y-3">
      {!items.length && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">No classes or events for the selected filters on this date.</p>}
      <PaginatedList items={items} label="Date entries">
        {(item) => {
          const verification = verifyClass(item, enrollments);
          const present = item.records.filter((record) => record.status === "Present").length;
          const absent = item.records.filter((record) => record.status === "Absent").length;
          return <article key={item.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide calendar-brand-link">{item.type === "class" ? item.automatic ? "Activity Class" : "Planned Class" : item.type}</span>
              {item.time && <span className="text-xs text-slate-500">{item.time} NPT</span>}</div>
            <h3 className="mt-1 flex items-center gap-2 font-semibold text-slate-900">{item.activityId && <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/20" style={{ backgroundColor: colors[item.activityId]?.color || "#94A3B8" }} />}{item.type === "class" ? <Link className="calendar-brand-link underline-offset-4 hover:underline" to={attendanceLink(date, item.activityId)}>{item.activityName || item.title}</Link> : item.title}</h3>
            {item.type === "class" && <>
              <p className="mt-2 text-sm text-slate-600">{item.records.length ? `${item.records.length} recorded · ${present} present · ${absent} absent` : date < today ? "Attendance not recorded" : "Attendance pending"}</p>
              {enrollmentsLoaded && <p className="mt-1 text-xs text-slate-500">{verification.eligible} currently active students enrolled by this date · {verification.unmarked} unmarked</p>}
              {verification.beforeEnrollment > 0 && <p className="mt-2 text-sm text-amber-700">Review required: {verification.beforeEnrollment} attendance record(s) are before the student's enrollment date.</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
                <Link to={attendanceLink(date, item.activityId)} className="rounded-lg calendar-secondary-cta px-3 py-2">View attendance →</Link>
                {isAdmin && date <= today && <Link to={`/attendance/add?${new URLSearchParams({ date, activity: item.activityId })}`} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">{item.records.length ? "Update attendance" : "Take attendance"}</Link>}
              </div>
            </>}
            {item.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.notes}</p>}
            {isAdmin && !item.automatic && <div className="mt-3 text-xs">
              {removing === item.id ? <div className="space-y-2"><p>Remove this calendar entry? Recorded attendance will remain.</p><button type="button" disabled={busy} onClick={() => void remove(item.id)} className="mr-3 font-semibold text-red-700">Confirm removal</button><button type="button" disabled={busy} onClick={() => setRemoving("")}>Cancel</button></div>
                : <button type="button" disabled={busy} onClick={() => setRemoving(item.id)} className="text-slate-500 underline">Remove calendar entry</button>}
            </div>}
          </article>;
        }}
      </PaginatedList>
    </div>}
    {isAdmin && !entriesUnavailable && !loading && <div className="mt-5 border-t border-slate-200 pt-4">
      {!adding ? <button type="button" onClick={() => setAdding(true)} className="min-h-11 inline-flex items-center gap-2 rounded-lg calendar-cta px-4 py-2 text-sm font-medium"><Plus size={16} /> Add class or event</button>
        : <SafeForm onSubmit={save} className="space-y-3">
          <h3 className="font-semibold">Add to {formatBSDate(date)} BS</h3>
          <fieldset disabled={busy} className="space-y-3">
            <label className="block text-sm">Type<SearchableSelect value={type} onChange={(event) => setType(event.target.value as CalendarEntryType)} className={inputClass}><option value="class">Planned class</option><option value="event">Event</option><option value="holiday">Holiday</option></SearchableSelect></label>
            {type === "class" ? <label className="block text-sm">Activity<SearchableSelect required value={activityId} onChange={(event) => setActivityId(event.target.value)} className={inputClass}><option value="">Choose an activity</option>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.name}</option>)}</SearchableSelect>{!activities.length && <span className="text-xs text-slate-500">Add an activity enrollment first.</span>}</label>
              : <label className="block text-sm">Title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></label>}
            <label className="block text-sm">Time in Nepal (optional)<input type="time" value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} /></label>
            <label className="block text-sm">Notes (optional)<textarea maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} /></label>
            <div className="flex gap-3"><button type="submit" className="min-h-11 rounded-lg calendar-cta px-4 py-2 text-sm font-medium">{busy ? "Saving…" : "Save entry"}</button><button type="button" onClick={() => setAdding(false)} className="ui-button border border-slate-300 py-2">Cancel</button></div>
          </fieldset>
        </SafeForm>}
    </div>}
  </dialog>;
}
