import type { Attendance } from "@/features/attendance/types/attendance.types";
import AttendanceActions from "@/features/attendance/components/AttendanceActions";
import { formatBSDate } from "@/utils/nepali-date";

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
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-slate-600">No attendance records found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[800px]">
        <thead className="border-b border-slate-200 bg-slate-100">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
              Code
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
              Student
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
              Activity
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
              Date (BS)
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
              Status
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
              Session Fee
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((record, index) => (
            <tr
              key={record.id}
              className={
                index % 2 === 0 ? "bg-white" : "bg-slate-50"
              }
            >
              <td className="px-6 py-4 text-sm font-medium text-blue-600">
                {record.attendanceCode}
              </td>
              <td className="px-6 py-4 text-sm text-slate-900">
                <div className="font-medium">{record.studentName}</div>
                <div className="text-xs text-slate-600">{record.studentCode}</div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-900">
                <div className="font-medium">{record.activityName}</div>
                <div className="text-xs text-slate-600">{record.activityCode}</div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-900">
                <div className="font-semibold">{record.sessionDateBS || record.sessionDate}</div>
                <div className="text-xs text-slate-500">
                  {formatBSDate(record.sessionDateBS || record.sessionDate, 'full')}
                </div>
              </td>
              <td className="px-6 py-4 text-sm">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    record.status === "Present"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {record.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-slate-900">
                Rs. {record.sessionFee?.toFixed(2) || "0.00"}
              </td>
              <td className="px-6 py-4 text-sm">
                <AttendanceActions
                  recordId={record.id || ""}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isLoading={isLoading}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
