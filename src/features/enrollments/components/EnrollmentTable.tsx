import {
  CalendarDays,
  UserRound,
  Activity as ActivityIcon,
} from "lucide-react";

import type { Enrollment } from "../types/enrollment.types";
import EnrollmentActions from "./EnrollmentActions";

type Props = {
  enrollments: Enrollment[];

  onViewEnrollment: (
    enrollment: Enrollment
  ) => void;

  onEditEnrollment: (
    enrollment: Enrollment
  ) => void;

  onDeleteEnrollment: (
    enrollment: Enrollment
  ) => void;
};

export default function EnrollmentTable({
  enrollments,
  onViewEnrollment,
  onEditEnrollment,
  onDeleteEnrollment,
}: Props) {
  if (enrollments.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <ActivityIcon
            size={22}
            className="text-slate-400"
          />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-slate-900">
          No enrollments found
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Try changing your search or filter.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Desktop / Tablet Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Enrollment Code
              </th>

              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Student
              </th>

              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Activity
              </th>

              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Enrollment Date
              </th>

              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Session Fee
              </th>

              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>

              <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {enrollments.map((enrollment) => (
              <tr
                key={enrollment.id}
                className="transition hover:bg-slate-50/80"
              >
                {/* Enrollment Code */}
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
                    {enrollment.enrollmentCode}
                  </span>
                </td>

                {/* Student */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                      <UserRound size={16} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {enrollment.studentName}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {enrollment.studentCode || "-"}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Activity */}
                <td className="px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {enrollment.activityName}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {enrollment.activityCode || "-"}
                    </p>
                  </div>
                </td>

                {/* Date */}
                <td className="whitespace-nowrap px-5 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <CalendarDays
                      size={15}
                      className="text-slate-400"
                    />
                    {enrollment.enrollmentDate || "-"}
                  </div>
                </td>

                {/* Session Fee */}
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="text-sm font-semibold text-slate-900">
                    {typeof enrollment.sessionFee === "number"
                      ? `Rs. ${enrollment.sessionFee.toLocaleString()}`
                      : "-"}
                  </span>
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      enrollment.status === "Active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {enrollment.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <EnrollmentActions
                    onView={() =>
                      onViewEnrollment(enrollment)
                    }
                    onEdit={() =>
                      onEditEnrollment(enrollment)
                    }
                    onDelete={() =>
                      onDeleteEnrollment(enrollment)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="divide-y divide-slate-100 md:hidden">
        {enrollments.map((enrollment) => (
          <div
            key={enrollment.id}
            className="p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {enrollment.enrollmentCode}
                </span>

                <h3 className="mt-2 truncate text-sm font-semibold text-slate-900">
                  {enrollment.studentName}
                </h3>

                <p className="mt-0.5 text-xs text-slate-500">
                  {enrollment.studentCode}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  enrollment.status === "Active"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {enrollment.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Activity
                </p>

                <p className="mt-1 truncate text-sm font-medium text-slate-800">
                  {enrollment.activityName}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {enrollment.activityCode}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Session Fee
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {typeof enrollment.sessionFee === "number"
                    ? `Rs. ${enrollment.sessionFee.toLocaleString()}`
                    : "-"}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CalendarDays size={14} />
                {enrollment.enrollmentDate}
              </div>

              <EnrollmentActions
                onView={() =>
                  onViewEnrollment(enrollment)
                }
                onEdit={() =>
                  onEditEnrollment(enrollment)
                }
                onDelete={() =>
                  onDeleteEnrollment(enrollment)
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}