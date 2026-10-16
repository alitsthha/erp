import StudentQuickActions from "@/components/common/StudentQuickActions";
import PaginatedList from "@/components/common/PaginatedList";
import type { Student } from "../types/student.types";
import StudentActions from "./StudentActions";

type Props = {
  students: Student[];
  onViewStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
};

export default function StudentTable({
  students,
  onViewStudent,
  onEditStudent,
  onDeleteStudent,
}: Props) {
  if (students.length === 0) {
    return (
      <div className="ui-surface p-10 text-center">
        <p className="text-sm font-medium text-slate-700">
          No students found.
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Try changing your search or filter.
        </p>
      </div>
    );
  }

  return (
    <div className="ui-surface overflow-hidden">
      {/* Mobile horizontal scroll */}
      <div className="w-full overflow-x-auto">
        <table className="ui-table min-w-[850px]">
          <thead className="ui-table-head border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Code
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Student
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Guardian
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Phone
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>

              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {<PaginatedList label="Students" showSort={false} items={students} table>{(student) => (
              <tr
                key={student.id}
                className="transition hover:bg-slate-50"
              >
                {/* Student Code */}
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {student.studentCode || "-"}
                  </span>
                </td>

                {/* Student */}
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {student.fullName}
                  </div>

                  {student.address && (
                    <div className="mt-1 max-w-[220px] truncate text-xs text-slate-400">
                      {student.address}
                    </div>
                  )}
                </td>

                {/* Guardian */}
                <td className="px-4 py-3 text-sm text-slate-600">
                  {student.guardianName || student.parentName || "-"}
                </td>

                {/* Guardian Phone */}
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {student.guardianPhone || "-"}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      student.status === "Active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {student.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <StudentQuickActions studentId={student.id} />
                      <StudentActions
                      onView={() => onViewStudent(student)}
                      onEdit={() => onEditStudent(student)}
                      onDelete={() => onDeleteStudent(student)}
                    />
                  </div>
                </td>
              </tr>
            )}</PaginatedList>}
          </tbody>
        </table>
      </div>
    </div>
  );
}