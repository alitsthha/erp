import { useState } from "react";
import type { Attendance, AttendanceHistoryEntry } from "../types/attendance.types";
import { attendanceActorName, attendanceChangeFields } from "../utils/attendance-recorder";

function formatTime(value: unknown) {
  const timestamp = value as { toDate?: () => Date; seconds?: number } | undefined;
  const date = value instanceof Date ? value : timestamp?.toDate?.() || (typeof timestamp?.seconds === "number" ? new Date(timestamp.seconds * 1000) : typeof value === "string" ? new Date(value) : null);
  return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-NP", { timeZone: "Asia/Kathmandu", dateStyle: "medium", timeStyle: "short" }).format(date) + " NPT" : "Time unavailable";
}

function RecordHistory({ record }: { record: Attendance }) {
  const [history, setHistory] = useState<AttendanceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const load = async () => {
    if (!record.id || loading) return;
    setLoading(true);
    setError("");
    try {
      const { getAttendanceHistory } = await import("../services/attendance-history-query.service");
      setHistory(await getAttendanceHistory(record.id));
      setLoaded(true);
    }
    catch { setError("Unable to load history."); }
    finally { setLoading(false); }
  };
  const original = attendanceActorName(record, "recorded");
  const latest = attendanceActorName(record, "updated");
  return <div className="space-y-1">
    <p className="font-medium text-slate-700">{original || latest || "Not recorded"}</p>
    {!original && latest && <p className="text-slate-400">Original recorder unavailable</p>}
    {latest && <p className="text-slate-500">Last saved by {latest}</p>}
    <details onToggle={(event) => { if (event.currentTarget.open && !loaded && !loading) void load(); }}>
      <summary className="cursor-pointer text-brand-700">Change history</summary>
      <div className="mt-2 max-h-80 w-72 max-w-full space-y-3 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-slate-50 p-3 whitespace-normal">
        <p className="font-medium">{record.activityName || "Activity"}</p>
        {loading && <p role="status">Loading history…</p>}
        {error && <p role="alert" className="text-red-700">{error} <button type="button" className="underline" onClick={() => void load()}>Retry</button></p>}
        {loaded && !history.length && <p>No detailed history was recorded for this older entry.</p>}
        {history.map((entry) => <div key={entry.id} className="space-y-1 border-t border-slate-200 pt-2">
          <p className="font-medium">{entry.action === "created" ? "Created" : entry.action === "updated" ? "Edited" : "Saved without changes"} by {entry.actor.role === "admin" ? entry.actor.email || entry.actor.name : entry.actor.name || entry.actor.email}</p>
          <p className="text-slate-500">{formatTime(entry.createdAt)}</p>
          <ul className="space-y-1">{entry.changes.map((change) => <li key={change.field} className="break-words"><strong>{attendanceChangeFields[change.field as keyof typeof attendanceChangeFields] || change.field}:</strong> {entry.action !== "created" && <><span>{String(change.before) || "Empty"}</span> → </>}<span>{String(change.after) || "Empty"}</span></li>)}</ul>
        </div>)}
        <p className="text-slate-400">Detailed history begins when tracking was enabled. Earlier edits cannot be reconstructed.</p>
      </div>
    </details>
  </div>;
}

export default function AttendanceRecorderDetails({ records }: { records: Attendance[] }) {
  return <div className="min-w-44 space-y-3 text-xs">{records.map((record, index) => <div key={record.id || index}>
    {records.length > 1 && <p className="mb-1 text-slate-400">{record.activityName || "Activity"}</p>}
    <RecordHistory record={record} />
  </div>)}</div>;
}
