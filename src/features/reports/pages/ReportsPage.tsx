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

// ─── Pure jsPDF Report Builder (Zero external table dependencies) ────────────
function buildReportPDF(
  report: ReportData,
  finance: FinanceSummary
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const marginR = 14;
  const contentW = pageW - marginL - marginR;
  const bottomMargin = 18;

  const now = new Date().toLocaleDateString("en-NP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let y = 0;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageH - bottomMargin) {
      doc.addPage();
      y = 16;
      return true;
    }
    return false;
  }

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Financial & Academic Report", marginL, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Generated on ${now}`, marginL, 20);

  y = 35;

  // ── Section heading ──────────────────────────────────────────────────────
  function sectionHeading(title: string) {
    checkPageBreak(12);
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(marginL, y, contentW, 7.5, "F");
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(title, marginL + 3, y + 5.2);
    y += 11;
  }

  function statBox(
    x: number,
    boxY: number,
    w: number,
    label: string,
    val: string,
    bgRgb: [number, number, number]
  ) {
    doc.setFillColor(...bgRgb);
    doc.roundedRect(x, boxY, w, 17, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 3.5, boxY + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(val, x + 3.5, boxY + 13);
  }

  function rowLine(
    label: string,
    value: string,
    bgRgb: [number, number, number] | null = null
  ) {
    checkPageBreak(7.5);
    if (bgRgb) {
      doc.setFillColor(...bgRgb);
      doc.rect(marginL, y - 1, contentW, 6.5, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, marginL + 3, y + 3.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(value, pageW - marginR - 3, y + 3.8, { align: "right" });
    y += 7.5;
  }

  // ── 1. Overview Summary ──────────────────────────────────────────────────
  sectionHeading("ACADEMIC OVERVIEW");
  const boxW = (contentW - 9) / 4;
  const overviewBoxes = [
    { label: "Total Students", val: String(report.summary.totalStudents), bg: [239, 246, 255] as [number, number, number] },
    { label: "Activities", val: String(report.summary.totalActivities), bg: [240, 253, 244] as [number, number, number] },
    { label: "Enrollments", val: String(report.summary.totalEnrollments), bg: [255, 251, 235] as [number, number, number] },
    { label: "Active Students", val: String(report.summary.activeStudents), bg: [250, 245, 255] as [number, number, number] },
  ];
  overviewBoxes.forEach((box, i) => {
    statBox(marginL + i * (boxW + 3), y, boxW, box.label, box.val, box.bg);
  });
  y += 22;

  // ── 2. Financial Overview ────────────────────────────────────────────────
  sectionHeading("FINANCIAL OVERVIEW");
  const finBoxes = [
    { label: "Total Income", val: formatCurrency(finance.totalIncome), bg: [240, 253, 244] as [number, number, number] },
    { label: "Total Expenses", val: formatCurrency(finance.totalExpenses), bg: [255, 241, 242] as [number, number, number] },
    { label: "Net Profit / Loss", val: formatCurrency(finance.netProfit), bg: [239, 246, 255] as [number, number, number] },
    { label: "Outstanding", val: formatCurrency(finance.outstandingAmount), bg: [255, 251, 235] as [number, number, number] },
  ];
  finBoxes.forEach((box, i) => {
    statBox(marginL + i * (boxW + 3), y, boxW, box.label, box.val, box.bg);
  });
  y += 22;

  // ── 3. Income Statement ──────────────────────────────────────────────────
  sectionHeading("INCOME STATEMENT");
  rowLine("Gross Income", formatCurrency(finance.totalIncome));
  rowLine("Operating Expenses", formatCurrency(finance.totalExpenses));
  rowLine("Net Profit / Loss", formatCurrency(finance.netProfit), [209, 250, 229]);
  y += 4;

  // ── 4. Balance Sheet ─────────────────────────────────────────────────────
  sectionHeading("BALANCE SHEET");
  rowLine("Cash Balance", formatCurrency(finance.cashBalance));
  rowLine("Bank Balance", formatCurrency(finance.bankBalance));
  rowLine("Outstanding Receivables", formatCurrency(finance.outstandingAmount));
  rowLine("Overdue Amount", formatCurrency(finance.overdueAmount));
  const totalAssets = finance.cashBalance + finance.bankBalance + finance.outstandingAmount;
  rowLine("Total Assets", formatCurrency(totalAssets), [237, 233, 254]);
  y += 4;

  // ── 5. Enrollment by Activity Table ──────────────────────────────────────
  sectionHeading("ENROLLMENT BY ACTIVITY");

  // Table header
  checkPageBreak(12);
  doc.setFillColor(15, 23, 42);
  doc.rect(marginL, y, contentW, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Activity Name", marginL + 3, y + 4.8);
  doc.text("Code", marginL + 80, y + 4.8);
  doc.text("Total", marginL + 120, y + 4.8, { align: "center" });
  doc.text("Active", marginL + 160, y + 4.8, { align: "center" });
  y += 7;

  report.activityEnrollments.forEach((act, idx) => {
    checkPageBreak(7);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginL, y, contentW, 6.5, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(act.activityName, marginL + 3, y + 4.2);
    doc.text(act.activityCode, marginL + 80, y + 4.2);
    doc.text(String(act.enrollmentCount), marginL + 120, y + 4.2, { align: "center" });
    doc.text(String(act.activeEnrollmentCount), marginL + 160, y + 4.2, { align: "center" });
    y += 6.5;
  });
  if (report.activityEnrollments.length === 0) {
    rowLine("No activity data available", "");
  }
  y += 6;

  // ── 6. Recent Enrollments Table ──────────────────────────────────────────
  sectionHeading("RECENT ENROLLMENTS");

  checkPageBreak(12);
  doc.setFillColor(15, 23, 42);
  doc.rect(marginL, y, contentW, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Code", marginL + 3, y + 4.8);
  doc.text("Student", marginL + 30, y + 4.8);
  doc.text("Activity", marginL + 85, y + 4.8);
  doc.text("Date", marginL + 130, y + 4.8);
  doc.text("Fee", marginL + 155, y + 4.8, { align: "right" });
  doc.text("Status", marginL + 175, y + 4.8, { align: "center" });
  y += 7;

  report.recentEnrollments.forEach((e, idx) => {
    checkPageBreak(7.5);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginL, y, contentW, 7, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    doc.text(e.enrollmentCode, marginL + 3, y + 4.5);
    doc.text(`${e.studentName} (${e.studentCode})`, marginL + 30, y + 4.5);
    doc.text(`${e.activityName}`, marginL + 85, y + 4.5);
    doc.text(e.enrollmentDate, marginL + 130, y + 4.5);

    const feeStr = typeof e.sessionFee === "number" ? `Rs. ${e.sessionFee}` : "-";
    doc.text(feeStr, marginL + 155, y + 4.5, { align: "right" });

    // Status pill
    if (e.status === "Active") {
      doc.setFillColor(209, 250, 229);
      doc.roundedRect(marginL + 167, y + 1.2, 16, 4.5, 1, 1, "F");
      doc.setTextColor(6, 95, 70);
    } else {
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(marginL + 167, y + 1.2, 16, 4.5, 1, 1, "F");
      doc.setTextColor(71, 85, 105);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(e.status, marginL + 175, y + 4.2, { align: "center" });

    y += 7;
  });

  if (report.recentEnrollments.length === 0) {
    rowLine("No recent enrollments found", "");
  }

  // ── Footer on all pages ───────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginL, pageH - 10, pageW - marginR, pageH - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Academy ERP  ·  Financial & Academic Report", marginL, pageH - 5.5);
    doc.text(`Page ${page} of ${totalPages}`, pageW - marginR, pageH - 5.5, { align: "right" });
  }

  return doc;
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [finance, setFinance] = useState<FinanceSummary>(initialFinanceSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
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

  const handleExportPdf = () => {
    if (!report) return;
    setExporting(true);
    try {
      const doc = buildReportPDF(report, finance);
      doc.save("academy-financial-report.pdf");
    } catch (err) {
      console.error("Failed to export PDF report:", err);
    } finally {
      setExporting(false);
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
              onClick={handleExportPdf}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            >
              <Download size={16} />
              {exporting ? "Generating..." : "Export PDF"}
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