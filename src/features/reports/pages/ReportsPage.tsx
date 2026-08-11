import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  ClipboardList,
  GraduationCap,
  RefreshCw,
  Users,
} from "lucide-react";

import { getReportData } from "../services/reports.service";
import type { ReportData } from "../types/report.types";

type SummaryCardProps = {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
};

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
          <Icon
            size={21}
            className="text-slate-700"
            strokeWidth={1.8}
          />
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getReportData();
      setReport(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, []);

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="text-center">
              <RefreshCw
                size={28}
                className="mx-auto animate-spin text-slate-400"
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading reports...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
            <AlertCircle
              size={32}
              className="mx-auto text-red-500"
            />

            <p className="mt-3 font-medium text-slate-900">
              {error ?? "Unable to load report."}
            </p>

            <button
              type="button"
              onClick={() => void loadReport()}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { summary, activityEnrollments, recentEnrollments } =
    report;

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3
                size={24}
                className="text-slate-700"
              />

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Reports
              </h1>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Academy performance and management overview.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadReport()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            title="Total Students"
            value={summary.totalStudents}
            subtitle={`${summary.activeStudents} active students`}
            icon={GraduationCap}
          />

          <SummaryCard
            title="Activities"
            value={summary.totalActivities}
            subtitle={`${summary.activeActivities} active activities`}
            icon={Activity}
          />

          <SummaryCard
            title="Enrollments"
            value={summary.totalEnrollments}
            subtitle={`${summary.activeEnrollments} active enrollments`}
            icon={ClipboardList}
          />

          <SummaryCard
            title="Active Students"
            value={summary.activeStudents}
            subtitle="Currently active"
            icon={Users}
          />

        </div>

        {/* Activity Enrollment Report */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">
              Enrollment by Activity
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              See how many students are enrolled in each activity.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">

              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Activity
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Code
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Active
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {activityEnrollments.map((activity) => (
                  <tr
                    key={activity.activityId}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {activity.activityName}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {activity.activityCode}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {activity.enrollmentCount}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {activity.activeEnrollmentCount}
                      </span>
                    </td>
                  </tr>
                ))}

                {activityEnrollments.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-sm text-slate-500"
                    >
                      No activity data available.
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>
        </section>

        {/* Recent Enrollments */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">
              Recent Enrollments
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Latest student activity enrollments.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">

              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Enrollment
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Student
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Activity
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fee
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentEnrollments.map((enrollment) => (
                  <tr
                    key={enrollment.id ?? enrollment.enrollmentCode}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {enrollment.enrollmentCode}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {enrollment.studentName}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {enrollment.studentCode}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">
                        {enrollment.activityName}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {enrollment.activityCode}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {enrollment.enrollmentDate}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {typeof enrollment.sessionFee === "number"
                        ? `Rs. ${enrollment.sessionFee.toLocaleString(
                            "en-NP"
                          )}`
                        : "-"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          enrollment.status === "Active"
                            ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                            : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                        }
                      >
                        {enrollment.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {recentEnrollments.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-slate-500"
                    >
                      No enrollment records available.
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>
        </section>

      </div>
    </div>
  );
}