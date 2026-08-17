import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ClipboardCheck, Loader2, Pencil, UserCheck, UserX } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import type { Attendance } from "@/features/attendance/types/attendance.types";
import { getAttendanceByStudentId } from "@/features/attendance/services/attendance.service";

export default function StudentAttendanceDetailPage() {
  const navigate = useNavigate();
  const { studentId, dateBS } = useParams();

  const [records, setRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!studentId) {
        setRecords([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const allRecords = await getAttendanceByStudentId(studentId);
        const targetDate = dateBS ? decodeURIComponent(dateBS) : "";

        const filtered = targetDate
          ? allRecords.filter((item) => item.sessionDateBS === targetDate)
          : allRecords;

        setRecords(filtered);
      } catch (error) {
        console.error("Error loading student attendance:", error);
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [studentId, dateBS]);

  const studentName = useMemo(() => records[0]?.studentName || "Student", [records]);
  const studentCode = useMemo(() => records[0]?.studentCode || "", [records]);

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

  if (!records.length) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <ClipboardCheck size={22} />
          </div>

          <h1 className="mt-4 text-xl font-bold text-slate-900">No attendance found</h1>
          <p className="mt-2 text-sm text-slate-500">
            There are no attendance records for this student on the selected date.
          </p>

          <button
            type="button"
            onClick={() => navigate("/attendance")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <ArrowLeft size={17} />
            Back to Attendance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <button
          type="button"
          onClick={() => navigate("/attendance")}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          Back to Attendance
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Student attendance</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">{studentName}</h1>
              {studentCode && <p className="mt-1 text-sm text-slate-500">Code: {studentCode}</p>}
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
              <CalendarDays size={16} />
              {dateBS ? decodeURIComponent(dateBS) : records[0].sessionDateBS}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4 font-semibold">Activity</th>
              <th className="px-5 py-4 font-semibold">Date</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Fee</th>
              <th className="px-5 py-4 font-semibold">Notes</th>
              <th className="px-5 py-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => (
              <tr key={record.id || `${record.studentId}-${record.activityId}-${record.sessionDateBS}`} className="hover:bg-slate-50">
                <td className="px-5 py-4 align-top">
                  <div className="font-semibold text-slate-900">{record.activityName}</div>
                  <div className="mt-1 text-xs text-slate-400">{record.activityCode}</div>
                </td>

                <td className="px-5 py-4 align-top text-sm text-slate-700">
                  <div className="font-medium">{record.sessionDateBS}</div>
                  <div className="text-xs text-slate-400">{record.sessionDate}</div>
                </td>

                <td className="px-5 py-4 align-top">
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

                <td className="px-5 py-4 align-top text-sm text-slate-700">
                  Rs. {Number(record.sessionFee || 0).toLocaleString("en-IN")}
                </td>

                <td className="px-5 py-4 align-top text-sm text-slate-600">
                  {record.notes || "—"}
                </td>

                <td className="px-5 py-4 align-top text-right">
                  <button
                    type="button"
                    onClick={() => navigate(`/attendance/edit/${record.id}`)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
