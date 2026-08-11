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
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Mobile horizontal scroll */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[850px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Code
              </th>

              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Student
              </th>

              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Guardian
              </th>

              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Phone
              </th>

              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {students.map((student) => (
              <tr
                key={student.id}
                className="transition hover:bg-slate-50"
              >
                {/* Student Code */}
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {student.studentCode || "-"}
                  </span>
                </td>

                {/* Student */}
                <td className="px-5 py-4">
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
                <td className="px-5 py-4 text-sm text-slate-600">
                  {student.guardianName || "-"}
                </td>

                {/* Guardian Phone */}
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                  {student.guardianPhone || "-"}
                </td>

                {/* Status */}
                <td className="px-5 py-4">
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
                <td className="px-5 py-4">
                  <div className="flex justify-end">
                    <StudentActions
                      onView={() => onViewStudent(student)}
                      onEdit={() => onEditStudent(student)}
                      onDelete={() => onDeleteStudent(student)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}