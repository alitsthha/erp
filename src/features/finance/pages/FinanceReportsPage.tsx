import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, CalendarRange, TrendingUp } from "lucide-react";

import { getFinanceSummary } from "../services/finance.service";
import type { FinanceSummary } from "../types/finance.types";

const formatCurrency = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

export default function FinanceReportsPage() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
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

        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarRange size={16} className="text-slate-600" />
            Date Filter
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
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