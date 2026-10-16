import { useEffect, useRef, useState } from "react";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";
import { getCurrentBSDate } from "@/utils/nepali-date";
import type { Student } from "@/features/students/types/student.types";
import type { Activity } from "@/features/activities/types/activity.types";
import { getActivitiesForEnrollment, getStudentsForEnrollment } from "../services/enrollment.service";
import { bulkEnrollStudents, type BulkEnrollmentResult } from "../services/bulk-enrollment.service";

export default function BulkEnrollmentPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(getCurrentBSDate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [completed, setCompleted] = useState(0);
  const [error, setError] = useState("");
  const [results, setResults] = useState<BulkEnrollmentResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getStudentsForEnrollment(), getActivitiesForEnrollment()])
      .then(([studentList, activityList]) => {
        if (cancelled) return;
        setStudents(studentList.sort((a, b) => a.studentCode.localeCompare(b.studentCode)));
        setActivities(activityList.filter((item) => item.id && item.status === "Active"));
      })
      .catch(() => { if (!cancelled) setError("Unable to load students and activities. Reload to try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const term = search.trim().toLowerCase();
  const visibleStudents = students.filter((student) =>
    [student.id, student.studentCode, student.fullName].some((value) => value.toLowerCase().includes(term)));
  const total = selectedStudents.length * selectedActivities.length;
  const toggle = (ids: string[], id: string) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];

  const submit = async () => {
    if (submitting.current || !total) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    setResults([]);
    setCompleted(0);
    try {
      setResults(await bulkEnrollStudents(selectedStudents, selectedActivities, date, setCompleted));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk enrollment failed.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return <div className="space-y-6">
    <div>
      <h1 className="ui-page-title">Bulk Enrollment</h1>
      <p className="mt-2 text-sm text-slate-500">Find students by ID or name, then enroll them in one or more activities. Each selected student is enrolled in every selected activity.</p>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {loading ? <p role="status">Loading students and activities...</p> : <>
      <fieldset disabled={saving} className="space-y-6 disabled:opacity-60">
        <section className="ui-surface space-y-4 p-5">
          <h2 className="ui-section-title">Students ({selectedStudents.length} selected)</h2>
          <label className="block text-sm font-medium">Search by student ID or name
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="ui-field mt-2 w-full px-3" placeholder="Student ID or full name" />
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
            <button type="button" className="text-brand-600" onClick={() => setSelectedStudents([...new Set([...selectedStudents, ...visibleStudents.map((student) => student.id)])])}>Select all shown ({visibleStudents.length})</button>
            <button type="button" onClick={() => setSelectedStudents([])}>Clear selection</button>
          </div>
          <div className="max-h-80 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200">
            {!visibleStudents.length && <p className="p-4 text-sm text-slate-500">No students found.</p>}
            {visibleStudents.map((student) => <label key={student.id} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-slate-50">
              <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => setSelectedStudents(toggle(selectedStudents, student.id))} />
              <span><span className="font-medium">{student.studentCode} · {student.fullName}</span><span className="ml-2 text-xs text-slate-500">{student.status}</span></span>
            </label>)}
          </div>
        </section>
        <section className="ui-surface space-y-4 p-5">
          <h2 className="ui-section-title">Activities ({selectedActivities.length} selected)</h2>
          <p className="text-sm text-slate-500">Configured activity fees apply to every student.</p>
          {!activities.length && <p className="text-sm text-slate-500">No active activities. Add an activity before enrolling students.</p>}
          {activities.map((activity) => <label key={activity.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3">
            <input type="checkbox" checked={selectedActivities.includes(activity.id!)} onChange={() => setSelectedActivities(toggle(selectedActivities, activity.id!))} />
            <span>{activity.activityCode} · {activity.activityName}<span className="ml-2 text-sm text-slate-500">Rs. {(activity.countedMonthly ? activity.feePerMonth ?? 0 : activity.feePerSession ?? activity.sessionFee ?? activity.fee ?? 0).toLocaleString()} / {activity.countedMonthly ? "month" : "session"}</span></span>
          </label>)}
          <NepaliDatePickerInput label="Enrollment date (BS)" required value={date} onChange={setDate} />
        </section>
      </fieldset>
      <div className="ui-surface space-y-3 p-5">
        <p className="text-sm">{selectedStudents.length} students × {selectedActivities.length} activities = {total} enrollment requests. Existing enrollments, including inactive ones, are skipped.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={saving || !total || !date} onClick={() => void submit()} className="ui-button bg-brand-600 text-white disabled:opacity-50">{saving ? `Enrolling ${completed} / ${total}…` : `Create ${total} enrollments`}</button>
        </div>
        {saving && <p role="status" className="text-sm text-slate-500">Keep this page open until enrollment finishes.</p>}
      </div>
    </>}
    {results.length > 0 && <section className="ui-surface space-y-4 p-5" aria-live="polite">
      <h2 className="ui-section-title">Enrollment results</h2>
      <p>{results.filter((item) => item.status === "created").length} created · {results.filter((item) => item.status === "skipped").length} skipped · {results.filter((item) => item.status === "failed").length} failed</p>
      <p className="text-sm text-slate-500">You can submit again to retry failures. Existing enrollments will be skipped.</p>
      <ul className="max-h-96 divide-y divide-slate-100 overflow-auto">{results.map((result) => {
        const student = students.find((item) => item.id === result.studentId);
        const activity = activities.find((item) => item.id === result.activityId);
        return <li key={`${result.studentId}:${result.activityId}`} className="py-3 text-sm">
          <span className="font-medium">{student?.studentCode} · {student?.fullName} — {activity?.activityName}</span>
          <span className={`ml-2 ${result.status === "failed" ? "text-red-700" : "text-slate-600"}`}>{result.message}</span>
        </li>;
      })}</ul>
    </section>}
  </div>;
}
