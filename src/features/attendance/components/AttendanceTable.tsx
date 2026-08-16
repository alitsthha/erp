import type { Attendance } from "@/features/attendance/types/attendance.types";
import AttendanceActions from "@/features/attendance/components/AttendanceActions";
import { formatBSDate } from "@/utils/nepali-date";
import { UserCheck, UserX } from "lucide-react";

interface AttendanceTableProps {
  data: Attendance[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export default function AttendanceTable({
  data,
  onEdit,
  onDelete,
  isLoading,
}: AttendanceTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-600">No attendance records found for this view.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[850px] text-left">
        <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-5 py-3.5">Code</th>
            <th className="px-5 py-3.5">Student</th>
            <th className="px-5 py-3.5">Activity</th>
            <th className="px-5 py-3.5">Nepali Date (BS)</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5">Session Fee</th>
            <th className="px-5 py-3.5">Notes</th>
            <th className="px-5 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {data.map((record) => {
            const isPresent = record.status === "Present";
            const dateBS = record.sessionDateBS || record.sessionDate;

            return (
              <tr
                key={record.id || `${record.studentId}-${record.activityId}-${dateBS}`}
                className="transition hover:bg-slate-50/80"
              >
                {/* Code */}
                <td className="px-5 py-4 align-middle font-mono text-xs font-semibold text-blue-600">
                  {record.attendanceCode || "—"}
                </td>

                {/* Student */}
                <td className="px-5 py-4 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                      {record.studentName?.charAt(0)?.toUpperCase() || "S"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {record.studentName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {record.studentCode || "No Code"}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Activity */}
                <td className="px-5 py-4 align-middle">
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800">
                    <span>{record.activityName}</span>
                  </div>
                  {record.activityCode && (
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {record.activityCode}
                    </p>
                  )}
                </td>

                {/* Date BS */}
                <td className="px-5 py-4 align-middle">
                  <div className="font-semibold text-slate-900">{dateBS}</div>
                  <div className="text-xs text-slate-500">
                    {formatBSDate(dateBS, "full")}
                  </div>
                </td>

                {/* Status */}
                <td className="px-5 py-4 align-middle">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      isPresent
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {isPresent ? (
                      <UserCheck size={13} className="text-emerald-600" />
                    ) : (
                      <UserX size={13} className="text-rose-600" />
                    )}
                    {record.status}
                  </span>
                </td>

                {/* Session Fee */}
                <td className="px-5 py-4 align-middle font-medium text-slate-900">
                  Rs. {Number(record.sessionFee || 0).toLocaleString("en-IN")}
                </td>

                {/* Notes */}
                <td className="px-5 py-4 align-middle text-xs text-slate-500">
                  {record.notes ? (
                    <span className="italic text-slate-600">{record.notes}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-5 py-4 align-middle text-right">
                  <AttendanceActions
                    recordId={record.id || ""}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isLoading={isLoading}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
