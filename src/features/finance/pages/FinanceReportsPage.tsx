import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, CalendarRange, Download, TrendingUp } from "lucide-react";
import jsPDF from "jspdf";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";

import { getFinanceSummary, subscribeToFinanceLedger } from "../services/finance.service";
import type { FinanceLedgerEntry, FinanceSummary } from "../types/finance.types";
import { getCurrentBSDate } from "@/utils/nepali-date";

const formatCurrency = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

// ─── Pure jsPDF Finance Report Builder ───────────────────────────────────────
function buildFinanceReportPDF(
  summary: FinanceSummary,
  ledger: FinanceLedgerEntry[],
  startDate?: string,
  endDate?: string
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const marginR = 14;
  const contentW = pageW - marginL - marginR;

  const now = new Date().toLocaleDateString("en-NP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let y = 0;

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Financial Health & Cashflow Report", marginL, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  const dateRangeStr =
    startDate || endDate
      ? `Period: ${startDate || "Beginning"} to ${endDate || "Present"}`
      : `Generated on ${now}`;
  doc.text(dateRangeStr, marginL, 20);

  y = 36;

  // ── Section helper ───────────────────────────────────────────────────────
  function sectionHeading(title: string) {
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
    doc.roundedRect(x, boxY, w, 18, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 3.5, boxY + 6.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(val, x + 3.5, boxY + 13.5);
  }

  function rowLine(
    label: string,
    value: string,
    bgRgb: [number, number, number] | null = null
  ) {
    if (bgRgb) {
      doc.setFillColor(...bgRgb);
      doc.rect(marginL, y - 1, contentW, 7, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, marginL + 3, y + 4.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(value, pageW - marginR - 3, y + 4.2, { align: "right" });
    y += 8;
  }

  // ── 1. Financial Overview KPI Boxes ──────────────────────────────────────
  sectionHeading("FINANCIAL OVERVIEW");
  const boxW = (contentW - 9) / 4;
  const finBoxes = [
    { label: "Total Income", val: formatCurrency(summary.totalIncome), bg: [240, 253, 244] as [number, number, number] },
    { label: "Total Expenses", val: formatCurrency(summary.totalExpenses), bg: [255, 241, 242] as [number, number, number] },
    { label: "Net Profit / Loss", val: formatCurrency(summary.netProfit), bg: [239, 246, 255] as [number, number, number] },
    { label: "Outstanding", val: formatCurrency(summary.outstandingAmount), bg: [255, 251, 235] as [number, number, number] },
  ];
  finBoxes.forEach((box, i) => {
    statBox(marginL + i * (boxW + 3), y, boxW, box.label, box.val, box.bg);
  });
  y += 24;

  // ── 2. Cash Flow Summary ─────────────────────────────────────────────────
  sectionHeading("CASH FLOW & LIQUIDITY SUMMARY");
  rowLine("Gross Income Recorded", formatCurrency(summary.totalIncome));
  rowLine("Operating Expenses Recorded", formatCurrency(summary.totalExpenses));
  rowLine("Net Profit / Loss", formatCurrency(summary.netProfit), [209, 250, 229]);
  y += 4;

  // ── 3. Account Balances & Receivables ────────────────────────────────────
  sectionHeading("ACCOUNT BALANCES & RECEIVABLES");
  rowLine("Cash Account Balance", formatCurrency(summary.cashBalance));
  rowLine("Bank Account Balance", formatCurrency(summary.bankBalance));
  rowLine("Outstanding Student Receivables", formatCurrency(summary.outstandingAmount));
  rowLine("Overdue Amount", formatCurrency(summary.overdueAmount));
  rowLine("Pending Invoices Count", `${summary.outstandingInvoices} Pending Invoices`);

  const totalLiquidity = summary.cashBalance + summary.bankBalance;
  rowLine("Total Liquid Assets (Cash + Bank)", formatCurrency(totalLiquidity), [237, 233, 254]);

  sectionHeading("FINANCIAL LEDGER");
  ledger.slice(0, 24).forEach((entry) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${entry.date}  ${entry.type}  ${entry.description}`.slice(0, 74), marginL + 3, y + 4.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(entry.type === "Income" ? 5 : 190, entry.type === "Income" ? 150 : 18, entry.type === "Income" ? 105 : 60);
    doc.text(formatCurrency(entry.amount), pageW - marginR - 3, y + 4.2, { align: "right" });
    y += 7;
    if (y > pageH - 20) {
      doc.addPage();
      y = 18;
    }
  });

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.line(marginL, pageH - 12, pageW - marginR, pageH - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Academy ERP  ·  Finance & Cash Flow Statement", marginL, pageH - 7);
  doc.text("Page 1 of 1", pageW - marginR, pageH - 7, { align: "right" });

  return doc;
}

export default function FinanceReportsPage() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [periodPreset, setPeriodPreset] = useState<"custom" | "weekly" | "monthly" | "annual">("custom");
  const [ledger, setLedger] = useState<FinanceLedgerEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    outstandingAmount: 0,
    outstandingInvoices: 0,
    overdueAmount: 0,
    cashBalance: 0,
    bankBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  function applyPreset(preset: "weekly" | "monthly" | "annual") {
    const [year, month, day] = getCurrentBSDate().split("-").map(Number);
    const start = preset === "annual"
      ? `${year}-01-01`
      : preset === "monthly"
        ? `${year}-${String(month).padStart(2, "0")}-01`
        : `${year}-${String(month).padStart(2, "0")}-${String(Math.max(day - 6, 1)).padStart(2, "0")}`;
    setStartDate(start);
    setEndDate(getCurrentBSDate());
    setPeriodPreset(preset);
  }

  async function loadReport() {
    try {
      setLoading(true);
      const data = await getFinanceSummary({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setSummary(data);
    } catch (error) {
      console.error("Failed to load finance report:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  useEffect(() => subscribeToFinanceLedger(
    { startDate: startDate || undefined, endDate: endDate || undefined },
    (entries) => {
      setLedger(entries);
      void getFinanceSummary({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }).then(setSummary).catch((error) => {
        console.error("Failed to refresh finance summary:", error);
      });
    },
    (error) => console.error("Failed to subscribe to finance ledger:", error),
  ), [startDate, endDate]);

  const chartBars = useMemo(() => {
    const max = Math.max(summary.totalIncome, summary.totalExpenses, summary.netProfit, 1);

    return [
      {
        label: "Income",
        value: summary.totalIncome,
        color: "bg-emerald-500",
        height: (summary.totalIncome / max) * 100,
      },
      {
        label: "Expense",
        value: summary.totalExpenses,
        color: "bg-rose-500",
        height: (summary.totalExpenses / max) * 100,
      },
      {
        label: "Profit",
        value: summary.netProfit,
        color: "bg-blue-500",
        height: (summary.netProfit / max) * 100,
      },
    ];
  }, [summary]);

  const handleExportPdf = () => {
    setExporting(true);
    try {
      const doc = buildFinanceReportPDF(summary, ledger, startDate, endDate);
      doc.save("finance-report.pdf");
    } catch (err) {
      console.error("Failed to export finance PDF report:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/finance")}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to Finance
            </button>

            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Finance Reports</h1>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Track student fee cash flow, expenses, profit, and account health by date.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            >
              <Download size={16} />
              {exporting ? "Generating..." : "Export PDF Report"}
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarRange size={16} className="text-slate-600" />
            Date Filter
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(["weekly", "monthly", "annual"] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`rounded-lg px-3 py-2 text-xs font-medium ${periodPreset === preset ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                {preset[0].toUpperCase() + preset.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">From</label>
              <NepaliDatePickerInput value={startDate} onChange={setStartDate} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">To</label>
              <NepaliDatePickerInput value={endDate} onChange={setEndDate} />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void loadReport()}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Realtime Financial Ledger</h2>
            <span className="text-xs font-medium text-emerald-600">Live updates enabled</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.slice(0, 50).map((entry) => (
                  <tr key={`${entry.type}-${entry.id}`} className="border-b border-slate-100">
                    <td className="px-3 py-2">{entry.date}</td>
                    <td className={entry.type === "Income" ? "px-3 py-2 text-emerald-600" : "px-3 py-2 text-rose-600"}>{entry.type}</td>
                    <td className="px-3 py-2">{entry.description}</td>
                    <td className="px-3 py-2 text-slate-500">{entry.reference}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(entry.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ledger.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No financial records for this period.</p>}
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Income</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(summary.totalIncome)}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Expenses</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(summary.totalExpenses)}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Profit</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(summary.netProfit)}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Outstanding</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(summary.outstandingAmount)}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">Cash Flow Overview</h2>
            </div>

            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">Loading chart...</div>
            ) : (
              <div className="flex h-60 items-end gap-4 rounded-xl bg-slate-50 p-4">
                {chartBars.map((bar) => (
                  <div key={bar.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-xs font-medium text-slate-500">{formatCurrency(bar.value)}</span>
                    <div className={`w-full rounded-t-xl ${bar.color}`} style={{ height: `${Math.max(bar.height, 12)}%` }} />
                    <span className="text-xs text-slate-600">{bar.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Finance Summary</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3">
                <span className="text-sm text-slate-600">Cash Balance</span>
                <span className="font-semibold text-slate-900">{formatCurrency(summary.cashBalance)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3">
                <span className="text-sm text-slate-600">Bank Balance</span>
                <span className="font-semibold text-slate-900">{formatCurrency(summary.bankBalance)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3">
                <span className="text-sm text-slate-600">Overdue</span>
                <span className="font-semibold text-slate-900">{formatCurrency(summary.overdueAmount)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-100 p-3">
                <span className="text-sm text-slate-600">Invoices Due</span>
                <span className="font-semibold text-slate-900">{summary.outstandingInvoices}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}