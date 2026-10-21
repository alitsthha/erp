import BSMonthSelect from "../components/BSMonthSelect";
import { convertADToBS, getCurrentBSDate } from "@/utils/nepali-date";
import { filterFinanceOverviewPeriod } from "../services/finance-overview.service";
import { useSessionState } from "@/hooks/useSessionState";
import { financeRecordDate } from "../services/finance-date";
import PaginatedList from "@/components/common/PaginatedList";
import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  BriefcaseBusiness,
  Building2,
  Download,
  FileText,
  Loader2,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FinanceRecord } from "../services/finance-overview.service";
import { useFinanceOverview } from "../hooks/useFinanceOverview";
import type { FinanceSummary } from "../types/finance.types";

const emptyRecords: FinanceRecord[] = [];
type OverviewTransaction = { type: string; description: string; amount: number; status: string; positive: boolean; time: string };

const initialSummary: FinanceSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  netProfit: 0,
  outstandingAmount: 0,
  outstandingInvoices: 0,
  overdueAmount: 0,
  cashBalance: 0,
  bankBalance: 0,
};

const periodOptions = [
  { key: "monthly", label: "Monthly" },
  { key: "overall", label: "Overall" },
] as const;

type TrendPoint = {
  name: string;
  income: number;
  expenses: number;
};

function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

// ─── Pure jsPDF Finance Overview PDF Builder ─────────────────────────────────
function buildFinanceOverviewPDF(
  summary: FinanceSummary,
  period: string,
  recentTransactions: OverviewTransaction[],
  expectedIncome: number,
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
  doc.text("Financial Performance Overview", marginL, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Period: ${period.toUpperCase()}  ·  Generated on ${now}`, marginL, 20);

  y = 35;

  function sectionHeading(title: string) {
    checkPageBreak(12);
    doc.setFillColor(241, 245, 249);
    doc.rect(marginL, y, contentW, 7.5, "F");
    doc.setTextColor(30, 41, 59);
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

  // 1. Key Performance Indicators
  sectionHeading("KEY FINANCIAL INDICATORS");
  const boxW = (contentW - 6) / 3;
  statBox(marginL, y, boxW, "Total Income", formatCurrency(summary.totalIncome), [240, 253, 244]);
  statBox(marginL + boxW + 3, y, boxW, "Total Expenses", formatCurrency(summary.totalExpenses), [255, 241, 242]);
  statBox(marginL + (boxW + 3) * 2, y, boxW, "Net Profit", formatCurrency(summary.netProfit), [239, 246, 255]);
  y += 20;

  statBox(marginL, y, boxW, "Outstanding Amount", formatCurrency(summary.outstandingAmount), [255, 251, 235]);
  statBox(marginL + boxW + 3, y, boxW, "Cash Balance", formatCurrency(summary.cashBalance), [248, 250, 252]);
  statBox(marginL + (boxW + 3) * 2, y, boxW, "Bank Balance", formatCurrency(summary.bankBalance), [245, 243, 255]);
  y += 24;

  rowLine("Expected monthly income", formatCurrency(expectedIncome));
  y += 4;

  // 2. Profit & Loss Statement
  sectionHeading("PROFIT & LOSS SUMMARY");
  rowLine("Gross Income", formatCurrency(summary.totalIncome));
  rowLine("Total Operational Expenses", formatCurrency(summary.totalExpenses));
  rowLine("Net Operating Profit", formatCurrency(summary.netProfit), [209, 250, 229]);
  y += 4;

  // 3. Accounts & Receivables
  sectionHeading("ACCOUNTS & RECEIVABLES");
  rowLine("Cash on Hand", formatCurrency(summary.cashBalance));
  rowLine("Bank Account Balance", formatCurrency(summary.bankBalance));
  rowLine("Outstanding Student Invoices", `${summary.outstandingInvoices} Unpaid Invoices`);
  rowLine("Total Outstanding Receivables", formatCurrency(summary.outstandingAmount));
  rowLine("Overdue Amount", formatCurrency(summary.overdueAmount));
  y += 4;

  // 4. Recent Financial Transactions Table
  sectionHeading("RECENT FINANCIAL TRANSACTIONS");
  checkPageBreak(12);
  doc.setFillColor(15, 23, 42);
  doc.rect(marginL, y, contentW, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Type", marginL + 3, y + 4.8);
  doc.text("Description / Party", marginL + 45, y + 4.8);
  doc.text("Amount", marginL + 130, y + 4.8, { align: "right" });
  doc.text("Status", marginL + 155, y + 4.8);
  doc.text("Time", marginL + 180, y + 4.8, { align: "right" });
  y += 7;

  recentTransactions.forEach((txn, idx) => {
    checkPageBreak(7.5);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginL, y, contentW, 7, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    doc.text(String(txn.type), marginL + 3, y + 4.5);
    doc.text(String(txn.description).slice(0, 32), marginL + 45, y + 4.5);

    const sign = txn.positive ? "+" : "-";
    const amtStr = `${sign}${formatCurrency(Math.abs(txn.amount))}`;
    if (txn.positive) {
      doc.setTextColor(6, 95, 70);
    } else {
      doc.setTextColor(159, 18, 57);
    }
    doc.setFont("helvetica", "bold");
    doc.text(amtStr, marginL + 130, y + 4.5, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(String(txn.status), marginL + 155, y + 4.5);
    doc.text(String(txn.time), marginL + 180, y + 4.5, { align: "right" });

    y += 7;
  });

  if (recentTransactions.length === 0) {
    rowLine("No recent transactions recorded", "");
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginL, pageH - 10, pageW - marginR, pageH - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Academy ERP  ·  Finance Overview Statement", marginL, pageH - 5.5);
    doc.text(`Page ${page} of ${totalPages}`, pageW - marginR, pageH - 5.5, { align: "right" });
  }

  return doc;
}

export default function FinancePage() {
  const [period, setPeriod] = useSessionState<"monthly" | "overall">("finance:overview:period", "monthly");
  const [month, setMonth] = useSessionState("finance:overview:month", getCurrentBSDate().slice(0, 7));
  const rangeLabel = period === "monthly" ? `${month} (BS)` : "All dates";
  const { data: sourceData, loading: isLoading, error } = useFinanceOverview();
  const data = useMemo(() => sourceData ? filterFinanceOverviewPeriod(sourceData, period, month) : undefined, [sourceData, period, month]);
  const summary = data?.summary ?? initialSummary;
  const [isExporting, setIsExporting] = useState(false);
  const invoices = data?.invoices ?? emptyRecords;
  const expenses = data?.expenses ?? emptyRecords;
  const income = data?.income ?? emptyRecords;
  const payments = data?.payments ?? emptyRecords;

  // Calculate trend data from real data
  const trendData: TrendPoint[] = useMemo(() => {
    const allTransactions = [
      ...expenses.map((exp) => ({
        date: financeRecordDate(exp),
        amount: Number(exp.amount || 0),
        type: "expense",
      })),
      ...income.map((inc) => ({
        date: financeRecordDate(inc),
        amount: Number(inc.amount || 0),
        type: "income",
      })),
    ];

    const grouped: Record<string, { income: number; expenses: number }> = {};

    allTransactions.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0)).forEach((txn) => {
      if (!txn.date) return;
      const date = new Date(txn.date);
      const bsDate = convertADToBS(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
      const key = period === "monthly" ? bsDate : bsDate.slice(0, 7);

      if (!grouped[key]) {
        grouped[key] = { income: 0, expenses: 0 };
      }

      if (txn.type === "income") {
        grouped[key].income += txn.amount;
      } else {
        grouped[key].expenses += txn.amount;
      }
    });

    return Object.entries(grouped).map(([name, values]) => ({
      name,
      ...values,
    }));
  }, [expenses, income, period]);

  // Calculate revenue breakdown from invoices
  const revenueBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    const colors = ["var(--color-brand-600)", "var(--color-brand-green)", "var(--color-brand-900)", "var(--color-brand-yellow)"];

    invoices.forEach((inv) => {
      const category = String(inv.description || "Other Fees");
      categories[category] = (categories[category] || 0) + Number(inv.totalAmount || 0);
    });

    return Object.entries(categories)
      .map(([name, value], idx) => ({
        name,
        value: Number(value),
        color: colors[idx % colors.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [invoices]);

  // Calculate expense breakdown
  const expenseBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    const colors = ["var(--color-brand-700)", "var(--color-brand-yellow)", "var(--color-brand-green)", "var(--color-brand-300)"];

    expenses.forEach((exp) => {
      const category = String(exp.category || "Other");
      categories[category] = (categories[category] || 0) + Number(exp.amount || 0);
    });

    return Object.entries(categories)
      .map(([name, value], idx) => ({
        name,
        value: Number(value),
        color: colors[idx % colors.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [expenses]);

  // Calculate recent transactions from all sources
  const recentTransactions = useMemo(() => {
    const allTxns = [
      ...invoices.map((inv) => ({
        type: "Payment Received",
        description: String(inv.studentName || inv.description || "Invoice"),
        amount: Number(inv.totalAmount || 0),
        status: String(inv.status || "Unpaid"),
        date: financeRecordDate(inv),
        positive: true,
      })),
      ...income.filter((entry) => !entry.paymentId).map((entry) => ({
        type: String(entry.category || "Income"),
        description: String(entry.description || entry.source || "Income"),
        amount: Number(entry.amount || 0),
        status: "Recorded",
        date: financeRecordDate(entry),
        positive: true,
      })),
      ...expenses.map((exp) => ({
        type: String(exp.category || "Expense"),
        description: String(exp.description || exp.vendor || "Expense"),
        amount: Number(exp.amount || 0),
        status: String(exp.status || "Recorded"),
        date: financeRecordDate(exp),
        positive: false,
      })),
      ...payments.map((pay) => ({
        type: "Payment Recorded",
        description: String(pay.description || "Payment"),
        amount: Number(pay.amount || 0),
        status: String(pay.status || "Recorded"),
        date: financeRecordDate(pay),
        positive: true,
      })),
    ];

    return allTxns
      .filter((txn) => txn.date !== null)
      .sort((a, b) => b.date!.getTime() - a.date!.getTime())
      .map((txn) => {
        const now = new Date();
        const txnDate = txn.date!;
        const diffMs = now.getTime() - txnDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        let timeStr: string;
        if (diffHours < 1) timeStr = "Just now";
        else if (diffHours < 24) timeStr = `${diffHours}h ago`;
        else if (diffDays === 1) timeStr = "Yesterday";
        else if (diffDays < 7) timeStr = `${diffDays}d ago`;
        else timeStr = txnDate.toLocaleDateString();

        return {
          ...txn,
          time: timeStr,
        };
      });
  }, [invoices, expenses, income, payments]);

  const profitMargin = useMemo(() => {
    if (!summary.totalIncome) return 0;
    return Number(((summary.netProfit / summary.totalIncome) * 100).toFixed(1));
  }, [summary]);

  const handleExportReport = () => {
    setIsExporting(true);
    try {
      const doc = buildFinanceOverviewPDF(summary, `${period}: ${rangeLabel}`, recentTransactions, data?.expectedIncome ?? 0);
      doc.save("finance-overview-report.pdf");
    } catch (err) {
      console.error("Failed to export finance overview report:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const summaryCards = [
    {
      title: "Total Income",
      href: "/finance/overview/income",
      value: formatCurrency(summary.totalIncome),
      description: "Recorded income",
      icon: ArrowUpCircle,
      tone: "emerald",
    },
    {
      title: "Total Expenses",
      href: "/finance/overview/expenses",
      value: formatCurrency(summary.totalExpenses),
      description: "Operational spend",
      icon: ArrowDownCircle,
      tone: "rose",
    },
    {
      title: "Net Profit",
      href: "/finance/overview/net-profit",
      value: formatCurrency(summary.netProfit),
      description: `${profitMargin}% margin`,
      icon: TrendingUp,
      tone: "blue",
    },
    {
      title: "Outstanding",
      href: "/finance/overview/outstanding",
      value: formatCurrency(summary.outstandingAmount),
      description: `${summary.outstandingInvoices} unpaid invoices`,
      icon: FileText,
      tone: "amber",
    },
    {
      title: "Cash Balance",
      href: "/finance/overview/cash",
      value: formatCurrency(summary.cashBalance),
      description: "Recorded cash receipts",
      icon: Wallet,
      tone: "slate",
    },
    {
      title: "Bank Balance",
      href: "/finance/overview/bank",
      value: formatCurrency(summary.bankBalance),
      description: "Recorded bank / online receipts",
      icon: Banknote,
      tone: "violet",
    },
    {
      title: "Expected Income",
      href: `/finance/overview/expected-income?month=${data?.month ?? ""}`,
      value: data ? formatCurrency(data.expectedIncome) : "—",
      description: `Monthly fees / attendance · ${data?.month ?? ""} (BS)`,
      icon: ArrowUpCircle,
      tone: "emerald",
    },
  ];

  const cashFlowMix = [
    { name: "Income", value: summary.totalIncome, color: "var(--color-brand-green)" },
    { name: "Expenses", value: summary.totalExpenses, color: "#f97316" },
  ];

  return (
    <div className="min-w-0 space-y-6 pb-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-600">Finance & accounting</p>
          <h1 className="ui-page-title mt-2">Financial performance overview</h1>
          <p className="mt-2 text-sm text-slate-500">
            Student billing, fee collection, payroll, expenses, and profitability in one intelligent dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="ui-surface inline-flex p-1">
            {periodOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setPeriod(option.key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  period === option.key
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportReport}
            disabled={isExporting || isLoading || !!error}
            className="ui-button inline-flex items-center gap-2 bg-brand-600 py-2 text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            <Download size={16} />
            {isExporting ? "Generating..." : "Export report"}
          </button>
        </div>
      </div>

      {period === "monthly" && <BSMonthSelect value={month} onChange={setMonth} label="Overview month (BS)" />}
      <p className="text-sm text-slate-500">Showing {rangeLabel}. Expected Income is a monthly estimate for {month} (BS).</p>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Unable to load financial data: {error}</p>}

      {isLoading && (
        <div className="ui-surface flex items-center gap-2 p-4 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          Loading financial data...
        </div>
      )}

      {data && !error && (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              const badgeTone =
                card.tone === "emerald"
                  ? "bg-emerald-50 text-emerald-700"
                  : card.tone === "rose"
                    ? "bg-rose-50 text-rose-700"
                    : card.tone === "blue"
                      ? "bg-brand-50 text-brand-700"
                      : card.tone === "amber"
                        ? "bg-amber-50 text-amber-700"
                        : card.tone === "violet"
                          ? "bg-brand-50 text-brand-700"
                          : "bg-slate-100 text-slate-700";

              return (
                <Link key={card.title} to={card.href + (card.title === "Expected Income" ? "" : `?period=${period}&month=${month}`)} className="ui-surface block p-5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand-600">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{card.title}</p>
                      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{card.value}</p>
                    </div>
                    <div className={`rounded-xl p-3 ${badgeTone}`}>
                      <Icon size={20} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">{card.description}</p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${badgeTone}`}>View details →</span>
                  </div>
                </Link>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="ui-surface p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="ui-section-title">Cash flow trend</h2>
                  <p className="text-sm text-slate-500">Income vs expenses · {rangeLabel}</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> Income</span>
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Expenses</span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-brand-600)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--color-brand-600)" stopOpacity={0.04} />
                      </linearGradient>
                      <linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(val) => `Rs. ${Number(val) / 1000}k`} />
                    <Tooltip formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name ?? "Amount")] } />
                    <Area type="monotone" dataKey="income" stroke="var(--color-brand-600)" strokeWidth={3} fill="url(#incomeArea)" />
                    <Area type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={3} fill="url(#expenseArea)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="ui-surface p-5">
              <h2 className="ui-section-title">Cash flow mix</h2>
              <p className="mt-1 text-sm text-slate-500">Current period distribution</p>

              <div className="mt-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cashFlowMix} dataKey="value" innerRadius={52} outerRadius={84} paddingAngle={4}>
                      {cashFlowMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), "Amount"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3 pt-2">
                {cashFlowMix.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      {entry.name}
                    </div>
                    <span className="font-semibold text-slate-900">{formatCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="ui-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="ui-section-title">Revenue breakdown</h2>
                  <p className="text-sm text-slate-500">Major fee streams</p>
                </div>
                <div className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">Selected range</div>
              </div>

              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueBreakdown} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={56} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(val) => `Rs. ${Number(val) / 1000}k`} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), "Revenue"]} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {revenueBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="ui-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="ui-section-title">Expense allocation</h2>
                  <p className="text-sm text-slate-500">Operational spending mix</p>
                </div>
                <div className="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">Selected range</div>
              </div>

              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBreakdown} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={56} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(val) => `Rs. ${Number(val) / 1000}k`} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), "Expense"]} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {expenseBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="ui-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="ui-section-title">Recent transactions</h2>
                  <p className="text-sm text-slate-500">Latest fee collections and financial activity</p>
                </div>
                <Link to="/finance/billing" className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
                  <Plus size={16} />
                  New invoice
                </Link>
              </div>

              <div className="mt-5">

              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="ui-table divide-y divide-slate-200">
                  <thead className="ui-table-head">
                    <tr>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Student / party</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {recentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                          No transactions yet.
                        </td>
                      </tr>
                    ) : (
                      <PaginatedList items={recentTransactions} table>{(entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700 text-sm">{entry.type}</td>
                          <td className="px-4 py-3 text-slate-700 text-sm max-w-xs truncate">{entry.description}</td>
                          <td className={`px-4 py-3 font-semibold text-sm ${entry.positive ? "text-emerald-700" : "text-rose-700"}`}>
                            {entry.positive ? "+" : "-"}{formatCurrency(Math.abs(entry.amount))}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                              entry.status === "Paid" ? "bg-emerald-50 text-emerald-700" :
                              entry.status === "Recorded" ? "bg-brand-50 text-brand-700" :
                              "bg-amber-50 text-amber-700"
                            }`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-sm">{entry.time}</td>
                        </tr>
                      )}</PaginatedList>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="ui-surface p-5">
                <h2 className="ui-section-title">Profit & loss</h2>
                <p className="mt-1 text-sm text-slate-500">Current period performance</p>

                <div className="mt-6 space-y-4">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <ArrowUpCircle size={18} />
                        <span className="text-sm font-medium">Gross income</span>
                      </div>
                      <span className="font-bold text-emerald-700">{formatCurrency(summary.totalIncome)}</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-rose-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-rose-700">
                        <ArrowDownCircle size={18} />
                        <span className="text-sm font-medium">Total expenses</span>
                      </div>
                      <span className="font-bold text-rose-700">{formatCurrency(summary.totalExpenses)}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-slate-700">
                        <TrendingUp size={18} />
                        <span className="text-sm font-medium">Net operating profit</span>
                      </div>
                      <span className="text-lg font-bold text-slate-900">{formatCurrency(summary.netProfit)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ui-surface p-5">
                <h2 className="ui-section-title">Finance tools</h2>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Invoice generation", icon: FileText, href: "/finance/billing" },
                    { label: "Payroll management", icon: BriefcaseBusiness, href: "/accounting/payroll" },
                    { label: "Salary setup", icon: Building2, href: "/accounting/salary-config" },
                    { label: "Expense tracking", icon: Banknote, href: "/finance/expenses" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        to={item.href}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-white hover:shadow-sm"
                      >
                        <span className="flex items-center gap-3"><Icon size={16} className="text-slate-500" /> {item.label}</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}