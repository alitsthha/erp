import { attendanceSelectionRecords } from "../utils/attendance-selection";
import PaginatedList from "@/components/common/PaginatedList";
import type { Attendance, AttendanceListRow } from "@/features/attendance/types/attendance.types";
import AttendanceActions from "@/features/attendance/components/AttendanceActions";
import { formatBSDate, getBSWeekday } from "@/utils/nepali-date";
import { UserCheck, UserX } from "lucide-react";
import type { ActivityColors } from "@/features/activities/utils/activity-color";
import { getActivityClassCounts, getAttendanceTeachers } from "../utils/attendance-recorder";

interface AttendanceTableProps {
  data: AttendanceListRow[];
  activityColors?: ActivityColors;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  canDelete?: boolean;
  classHistory?: Record<string, Attendance[]>;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export default function AttendanceTable({
  data,
  onEdit,
  onDelete,
  isLoading,
  canDelete = true,
  classHistory = {},
  activityColors = {},
  selectedIds = [],
  onSelectionChange,
}: AttendanceTableProps) {

  const selectableIds = attendanceSelectionRecords(data).map((record) => record.id!);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-600">No attendance records found for this view.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-b-xl bg-white">
      <table className="ui-table min-w-[800px]">
        <caption className="sr-only">Attendance records with student, date, status, classes taken and teacher</caption>
        <thead className="ui-table-head border-b border-slate-100">
          <tr>
            {onSelectionChange && <th scope="col" className="w-12 px-4 py-3">
              <input type="checkbox" aria-label={`Select all ${selectableIds.length} filtered attendance records across pages`} checked={allSelected}
                ref={(node) => { if (node) node.indeterminate = !allSelected && selectableIds.some((id) => selectedIds.includes(id)); }}
                disabled={isLoading || !selectableIds.length} onChange={() => onSelectionChange(allSelected ? [] : selectableIds)} />
            </th>}
            <th scope="col" className="px-4 py-3">Code</th>
            <th scope="col" className="px-4 py-3">Student</th>
            <th scope="col" className="px-4 py-3">Nepali Date (BS)</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Classes Taken</th>
            <th scope="col" className="px-4 py-3">Teacher</th>
            <th scope="col" className="px-4 py-3">Notes</th>
            <th scope="col" className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {<PaginatedList showSort={false} items={data} table>{(record) => {
            const rowIds = attendanceSelectionRecords([record]).map((item) => item.id!);
            const checked = rowIds.length > 0 && rowIds.every((id) => selectedIds.includes(id));
            const isPresent = record.status === "Present";
            const dateBS = record.sessionDateBS || record.sessionDate;
            const attendedClasses = classHistory[record.studentId] ?? [];
            const classCounts = getActivityClassCounts(record, attendedClasses);
            const teachers = getAttendanceTeachers(record.groupedRecords || [record]);

            return (
              <tr
                key={record.id || `${record.studentId}-${record.activityId}-${dateBS}`}
                className="transition hover:bg-brand-50/40"
              >
                {onSelectionChange && <td className="px-4 py-3">
                  <input type="checkbox" aria-label={`Select ${record.studentName} on ${dateBS}: ${rowIds.length} activity records`} checked={checked}
                    ref={(node) => { if (node) node.indeterminate = !checked && rowIds.some((id) => selectedIds.includes(id)); }}
                    disabled={isLoading || !rowIds.length} onChange={() => onSelectionChange(checked ? selectedIds.filter((id) => !rowIds.includes(id)) : [...new Set([...selectedIds, ...rowIds])])} />
                </td>}
                {/* Code */}
                <td className="px-4 py-3 align-middle font-mono text-xs font-semibold text-brand-600">
                  {record.attendanceCode || "—"}
                </td>

                {/* Student */}
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-semibold text-brand-600">
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

                {/* Date BS */}
                <td className="px-4 py-3 align-middle">
                  <div className="font-semibold text-slate-900">{dateBS}</div>
                  <div className="text-xs text-slate-500">
                    {formatBSDate(dateBS, "full")}
                  </div>
                  <div className="text-xs text-slate-500">{getBSWeekday(dateBS)}</div>
                </td>

                {/* Status */}
                <td className="px-4 py-3 align-middle">
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

                {/* Classes Taken: separate lifetime counts for each activity in this row. */}
                <td className="px-4 py-3 align-middle">
                  <div className="flex min-w-36 flex-wrap gap-1.5">
                    {classCounts.map((activity) => {
                      const color = activityColors[activity.id]?.color || "#94A3B8";
                      return <span key={activity.id} title={`${activity.name}: ${activity.count} ${activity.count === 1 ? "class" : "classes"} taken`} className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs text-slate-700" style={{ borderColor: `${color}55`, backgroundColor: `${color}0D` }}>
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                        <span>{activity.name || "Activity"}</span><strong className="text-slate-900">{activity.count}</strong>
                      </span>;
                    })}
                  </div>
                </td>

                {/* The user who last saved each activity's attendance. */}
                <td className="px-4 py-3 align-middle">
                  <div className="min-w-28 space-y-1">
                    {teachers.map((teacher) => <p key={teacher.id} title={`${teacher.activities.join(", ")} · ${teacher.id === "unknown" ? "Recorder unavailable for this older record" : "Last saved by " + teacher.name}`} className={`text-xs ${teacher.id === "unknown" ? "text-slate-400" : "font-medium text-slate-700"}`}>{teacher.name}</p>)}
                  </div>
                </td>

                {/* Notes */}
                <td className="px-4 py-3 align-middle text-xs text-slate-500">
                  {record.notes ? (
                    <span className="italic text-slate-600">{record.notes}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 align-middle text-right">
                  <AttendanceActions
                    recordId={record.id || ""}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isLoading={isLoading}
                    canDelete={canDelete}
                  />
                </td>
              </tr>
            );
          }}</PaginatedList>}
        </tbody>
      </table>
    </div>
  );
}
