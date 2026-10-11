import PaginatedList from "@/components/common/PaginatedList";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ClipboardCheck, Loader2, Pencil, UserCheck, UserX } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import type { Attendance } from "@/features/attendance/types/attendance.types";
import { getAttendanceByStudentId } from "@/features/attendance/services/attendance.service";
import { useAuth } from "@/app/providers/AuthProvider";
import { isActivityAllowedForRole } from "@/lib/rbac";
import { getBSWeekday } from "@/utils/nepali-date";
import { getAttendedClasses } from "../utils/attendance-tracking";

export default function StudentAttendanceDetailPage() {
  const { isAdmin, role, activityIds } = useAuth();
  const navigate = useNavigate();
  const { studentId, dateBS } = useParams();

  const [allRecords, setAllRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      if (!studentId) {
        setAllRecords([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await getAttendanceByStudentId(studentId);
        if (!cancelled) setAllRecords(data);
      } catch (error) {
        console.error("Error loading student attendance:", error);
        if (!cancelled) setAllRecords([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadData();
    return () => { cancelled = true; };
  }, [studentId]);

  const studentRecords = useMemo(() => allRecords.filter((record) =>
    record.studentId === studentId && !!role &&
    isActivityAllowedForRole(role, record.activityName, record.activityCode, activityIds, record.activityId)
  ), [allRecords, studentId, role, activityIds]);
  const targetDate = dateBS ?? "";
  const records = studentRecords.filter((record) =>
    !targetDate || (record.sessionDateBS || record.sessionDate) === targetDate
  );
  const attendedClasses = useMemo(() =>
    getAttendedClasses(studentRecords)[studentId ?? ""] ?? [],
  [studentRecords, studentId]);
  const studentName = studentRecords[0]?.studentName || "Student";
  const studentCode = studentRecords[0]?.studentCode || "";

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={30} className="animate-spin" />
          <p className="text-sm">Loading student attendance...</p>
        </div>
      </div>
    );
  }

  if (!studentRecords.length) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4">
        <div className="ui-surface w-full p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <ClipboardCheck size={22} />
          </div>

          <h1 className="ui-page-title mt-4">No attendance found</h1>
          <p className="mt-2 text-sm text-slate-500">
            There are no attendance records available for this student.
          </p>

          <button
            type="button"
            onClick={() => navigate("/attendance")}
            className="ui-button mt-6 inline-flex items-center gap-2 bg-brand-600 py-3 text-white transition hover:bg-brand-700"
          >
            <ArrowLeft size={17} />
            Back to Attendance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page mx-auto w-full space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate("/attendance")}
          className="ui-button mb-4 inline-flex items-center gap-2 border border-slate-300 bg-white py-2 text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          Back to Attendance
        </button>

        <div className="ui-surface p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Student attendance</p>
              <h1 className="ui-page-title mt-2">{studentName}</h1>
              {studentCode && <p className="mt-1 text-sm text-slate-500">Code: {studentCode}</p>}
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
              <CalendarDays size={16} />
              {targetDate ? `${targetDate} BS · ${getBSWeekday(targetDate)}` : "All dates"}
            </div>
          </div>
        </div>
      </div>

      <details open className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <summary className="cursor-pointer font-semibold text-brand-700">
          View dates · {attendedClasses.length} {attendedClasses.length === 1 ? "class" : "classes"} attended
        </summary>
        <p className="mt-2 text-sm text-slate-500">
          {studentName}'s attended classes, newest first. Select a date to review or edit its attendance below.
        </p>
        {attendedClasses.length > 0 ? (
          <ul className="mt-4 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
            {<PaginatedList items={attendedClasses} list>{(session) => {
              const attendedDate = session.sessionDateBS || session.sessionDate;
              const isSelected = attendedDate === targetDate;
              return (
                <li key={`${session.activityId}-${attendedDate}`}>
                  <Link
                    to={`/attendance/student/${encodeURIComponent(session.studentId)}/${encodeURIComponent(attendedDate)}`}
                    aria-current={isSelected ? "date" : undefined}
                    className={`block rounded-xl border p-3 text-sm transition ${isSelected
                      ? "border-brand-300 bg-brand-50 text-brand-800"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                  >
                    <span className="block font-semibold">{attendedDate} BS · {getBSWeekday(attendedDate)}</span>
                    <span className="mt-1 block text-xs">{session.activityName}{isSelected ? " · Selected date" : ""}</span>
                  </Link>
                </li>
              );
            }}</PaginatedList>}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No attended classes recorded yet.</p>
        )}
      </details>

      <div className="ui-surface overflow-x-auto">
        <table className="ui-table">
          <thead className="ui-table-head">
            <tr>
              <th className="px-4 py-3 font-semibold">Activity</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              {isAdmin && <th className="px-4 py-3 font-semibold">Fee</th>}
              <th className="px-4 py-3 font-semibold">Notes</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-sm text-slate-500">
                  No attendance recorded on this date. Select an attended date above to view its records.
                </td>
              </tr>
            )}
            {<PaginatedList items={records} table>{(record) => (
              <tr key={record.id || `${record.studentId}-${record.activityId}-${record.sessionDateBS}`} className="hover:bg-slate-50">
                <td className="px-4 py-3 align-top">
                  <div className="font-semibold text-slate-900">{record.activityName}</div>
                  <div className="mt-1 text-xs text-slate-400">{record.activityCode}</div>
                </td>

                <td className="px-4 py-3 align-top text-sm text-slate-700">
                  <div className="font-medium">{record.sessionDateBS || record.sessionDate} BS</div>
                  <div className="text-xs text-slate-400">{getBSWeekday(record.sessionDateBS || record.sessionDate)}</div>
                </td>

                <td className="px-4 py-3 align-top">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      record.status === "Present"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {record.status === "Present" ? <UserCheck size={13} /> : <UserX size={13} />}
                    {record.status}
                  </span>
                </td>

                {isAdmin && (
                  <td className="px-4 py-3 align-top text-sm text-slate-700">
                    Rs. {Number(record.sessionFee || 0).toLocaleString("en-IN")}
                  </td>
                )}

                <td className="px-4 py-3 align-top text-sm text-slate-600">
                  {record.notes || "—"}
                </td>

                <td className="px-4 py-3 align-top text-right">
                  <button
                    type="button"
                    onClick={() => navigate(`/attendance/edit/${record.id}`)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                </td>
              </tr>
            )}</PaginatedList>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
