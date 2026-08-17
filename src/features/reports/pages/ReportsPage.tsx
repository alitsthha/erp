import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Building2,
  ClipboardList,
  Download,
  GraduationCap,
  Landmark,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { getFinanceSummary } from "@/features/finance/services/finance.service";
import type { FinanceSummary } from "@/features/finance/types/finance.types";
import { getReportData } from "../services/reports.service";
import type { ReportData } from "../types/report.types";

type SummaryCardProps = {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
};

const initialFinanceSummary: FinanceSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  netProfit: 0,
  outstandingAmount: 0,
  outstandingInvoices: 0,
  overdueAmount: 0,
  cashBalance: 0,
  bankBalance: 0,
};

function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

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
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
          <Icon size={21} className="text-slate-700" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [finance, setFinance] = useState<FinanceSummary>(initialFinanceSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const [reportResult, financeResult] = await Promise.all([
        getReportData(),
        getFinanceSummary(),
      ]);

      setReport(reportResult);
      setFinance(financeResult);
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

  const balanceSheet = useMemo(() => {
    const totalAssets = finance.cashBalance + finance.bankBalance + finance.outstandingAmount;
    const totalLiabilities = finance.outstandingAmount + finance.overdueAmount;
    const equity = finance.netProfit;

    return {
      totalAssets,
      totalLiabilities,
      equity,
      totalLiabAndEquity: totalLiabilities + equity,
    };
  }, [finance]);

  const handleExportPdf = async () => {
    if (!reportRef.current) {
      return;
    }

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const margin = 28;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = margin - (heightLeft - pageHeight + margin * 2);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save("overall-financial-report.pdf");
    } catch (err) {
      console.error("Failed to export PDF report:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="text-center">
              <RefreshCw size={28} className="mx-auto animate-spin text-slate-400" />

              <p className="mt-3 text-sm text-slate-500">Loading reports...</p>
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
            <AlertCircle size={32} className="mx-auto text-red-500" />

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

  const { summary, activityEnrollments, recentEnrollments } = report;

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div ref={reportRef} className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={24} className="text-slate-700" />

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Financial & Academic Reports
              </h1>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Comprehensive overview of student performance and financial health.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadReport()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => void handleExportPdf()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>
        </div>

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

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Overall financial statement</h2>
              <p className="mt-1 text-xs text-slate-500">
                Income, expenses, profit/loss, and balance sheet summary.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Updated report
            </span>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-emerald-700">Total income</p>
                <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(finance.totalIncome)}</p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-rose-700">Total expenses</p>
                <ArrowDownCircle className="h-5 w-5 text-rose-600" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(finance.totalExpenses)}</p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700">Profit / loss</p>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(finance.netProfit)}</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-amber-700">Outstanding</p>
                <Building2 className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(finance.outstandingAmount)}</p>
            </div>
          </div>

          <div className="grid gap-5 border-t border-slate-200 p-5 sm:p-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600" />
                <h3 className="text-lg font-semibold text-slate-900">Income statement</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                  <span className="text-slate-600">Gross income</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(finance.totalIncome)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                  <span className="text-slate-600">Operating expenses</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(finance.totalExpenses)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-emerald-100 px-3 py-2">
                  <span className="text-emerald-700">Net profit / loss</span>
                  <span className="font-semibold text-emerald-800">{formatCurrency(finance.netProfit)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Landmark size={18} className="text-violet-600" />
                <h3 className="text-lg font-semibold text-slate-900">Balance sheet</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                  <span className="text-slate-600">Cash balance</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(finance.cashBalance)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                  <span className="text-slate-600">Bank balance</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(finance.bankBalance)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                  <span className="text-slate-600">Outstanding receivables</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(finance.outstandingAmount)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-violet-100 px-3 py-2">
                  <span className="text-violet-700">Total assets</span>
                  <span className="font-semibold text-violet-800">{formatCurrency(balanceSheet.totalAssets)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">Enrollment by activity</h2>
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
                  <tr key={activity.activityId} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-900">{activity.activityName}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {activity.activityCode}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{activity.enrollmentCount}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {activity.activeEnrollmentCount}
                      </span>
                    </td>
                  </tr>
                ))}

                {activityEnrollments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
                      No activity data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">Recent enrollments</h2>
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
                  <tr key={enrollment.id ?? enrollment.enrollmentCode} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {enrollment.enrollmentCode}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{enrollment.studentName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{enrollment.studentCode}</p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">{enrollment.activityName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{enrollment.activityCode}</p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">{enrollment.enrollmentDate}</td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {typeof enrollment.sessionFee === "number"
                        ? `Rs. ${enrollment.sessionFee.toLocaleString("en-NP")}`
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
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
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