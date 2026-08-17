import { useEffect, useMemo, useState } from "react";
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

import {
  getFinanceSummary,
  getFinanceInvoices,
  getFinanceExpenses,
  getFinanceIncome,
  getFinancePayments,
} from "../services/finance.service";
import type { FinanceSummary } from "../types/finance.types";

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
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
] as const;

type TrendPoint = {
  name: string;
  income: number;
  expenses: number;
};

function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

export default function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary>(initialSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<(typeof periodOptions)[number]["key"]>("monthly");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [income, setIncome] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const loadFinance = async () => {
      try {
        setIsLoading(true);
        const [
          summaryData,
          invoiceData,
          expenseData,
          incomeData,
          paymentData,
        ] = await Promise.all([
          getFinanceSummary(),
          getFinanceInvoices(),
          getFinanceExpenses(),
          getFinanceIncome(),
          getFinancePayments(),
        ]);

        setSummary(summaryData);
        setInvoices(invoiceData);
        setExpenses(expenseData);
        setIncome(incomeData);
        setPayments(paymentData);
      } catch (error) {
        console.error("Error loading finance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadFinance();
  }, []);

  // Calculate trend data from real data
  const trendData: TrendPoint[] = useMemo(() => {
    const allTransactions = [
      ...invoices.map((inv) => ({
        date: inv.createdAt?.toDate?.() || new Date(inv.createdAt),
        amount: Number(inv.totalAmount || 0),
        type: "income",
      })),
      ...expenses.map((exp) => ({
        date: exp.createdAt?.toDate?.() || new Date(exp.createdAt),
        amount: Number(exp.amount || 0),
        type: "expense",
      })),
      ...income.map((inc) => ({
        date: inc.createdAt?.toDate?.() || new Date(inc.createdAt),
        amount: Number(inc.amount || 0),
        type: "income",
      })),
      ...payments.map((pay) => ({
        date: pay.createdAt?.toDate?.() || new Date(pay.createdAt),
        amount: Number(pay.amount || 0),
        type: "income",
      })),
    ];

    const grouped: Record<string, { income: number; expenses: number }> = {};

    allTransactions.forEach((txn) => {
      let key = "";

      if (period === "daily") {
        const date = new Date(txn.date);
        const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
          date.getDay()
        ];
        key = dayOfWeek;
      } else if (period === "weekly") {
        const date = new Date(txn.date);
        const weekNum = Math.ceil(date.getDate() / 7);
        key = `W${weekNum}`;
      } else {
        const date = new Date(txn.date);
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        key = months[date.getMonth()];
      }

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
  }, [invoices, expenses, income, payments, period]);

  // Calculate revenue breakdown from invoices
  const revenueBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    const colors = ["#2563eb", "#14b8a6", "#8b5cf6", "#f59e0b"];

    invoices.forEach((inv) => {
      const category = inv.description || "Other Fees";
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
    const colors = ["#ef4444", "#f97316", "#facc15", "#84cc16"];

    expenses.forEach((exp) => {
      const category = exp.category || "Other";
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
        description: inv.studentName || inv.description || "Invoice",
        amount: Number(inv.totalAmount || 0),
        status: inv.status || "Unpaid",
        date: inv.createdAt?.toDate?.() || new Date(inv.createdAt),
        positive: true,
      })),
      ...expenses.map((exp) => ({
        type: exp.category || "Expense",
        description: exp.description || exp.vendor || "Expense",
        amount: Number(exp.amount || 0),
        status: exp.status || "Recorded",
        date: exp.createdAt?.toDate?.() || new Date(exp.createdAt),
        positive: false,
      })),
      ...payments.map((pay) => ({
        type: "Payment Recorded",
        description: pay.description || "Payment",
        amount: Number(pay.amount || 0),
        status: pay.status || "Recorded",
        date: pay.createdAt?.toDate?.() || new Date(pay.createdAt),
        positive: true,
      })),
    ];

    return allTxns
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6)
      .map((txn) => {
        const now = new Date();
        const txnDate = new Date(txn.date);
        const diffMs = now.getTime() - txnDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        let timeStr = "";
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
  }, [invoices, expenses, payments]);

  const profitMargin = useMemo(() => {
    if (!summary.totalIncome) return 0;
    return Number(((summary.netProfit / summary.totalIncome) * 100).toFixed(1));
  }, [summary]);

  const summaryCards = [
    {
      title: "Total Income",
      value: formatCurrency(summary.totalIncome),
      description: "This period",
      change: "+12.4%",
      icon: ArrowUpCircle,
      tone: "emerald",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(summary.totalExpenses),
      description: "Operational spend",
      change: "+6.1%",
      icon: ArrowDownCircle,
      tone: "rose",
    },
    {
      title: "Net Profit",
      value: formatCurrency(summary.netProfit),
      description: `${profitMargin}% margin`,
      change: "+9.8%",
      icon: TrendingUp,
      tone: "blue",
    },
    {
      title: "Outstanding",
      value: formatCurrency(summary.outstandingAmount),
      description: `${summary.outstandingInvoices} unpaid invoices`,
      change: "-2.3%",
      icon: FileText,
      tone: "amber",
    },
    {
      title: "Cash Balance",
      value: formatCurrency(summary.cashBalance),
      description: "On hand",
      change: "+4.2%",
      icon: Wallet,
      tone: "slate",
    },
    {
      title: "Bank Balance",
      value: formatCurrency(summary.bankBalance),
      description: "Institution account",
      change: "+8.7%",
      icon: Banknote,
      tone: "violet",
    },
  ];

  const cashFlowMix = [
    { name: "Income", value: summary.totalIncome || 1, color: "#10b981" },
    { name: "Expenses", value: summary.totalExpenses || 1, color: "#f97316" },
  ];

  return (
    <div className="min-w-0 space-y-6 pb-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">Finance & accounting</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Financial performance overview</h1>
          <p className="mt-2 text-sm text-slate-500">
            Student billing, fee collection, payroll, expenses, and profitability in one intelligent dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {periodOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setPeriod(option.key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  period === option.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Download size={16} />
            Export report
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
          <Loader2 size={18} className="animate-spin" />
          Loading financial data...
        </div>
      )}

      {!isLoading && (
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
                      ? "bg-blue-50 text-blue-700"
                      : card.tone === "amber"
                        ? "bg-amber-50 text-amber-700"
                        : card.tone === "violet"
                          ? "bg-violet-50 text-violet-700"
                          : "bg-slate-100 text-slate-700";

              return (
                <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${badgeTone}`}>{card.change}</span>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Cash flow trend</h2>
                  <p className="text-sm text-slate-500">Income vs expenses over the {period} period</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Income</span>
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Expenses</span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.04} />
                      </linearGradient>
                      <linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(val) => `Rs. ${Number(val) / 1000}k`} />
                    <Tooltip formatter={(value: any, name: any) => [formatCurrency(Number(value ?? 0)), String(name ?? "Amount")] } />
                    <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={3} fill="url(#incomeArea)" />
                    <Area type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={3} fill="url(#expenseArea)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Cash flow mix</h2>
              <p className="mt-1 text-sm text-slate-500">Current period distribution</p>

              <div className="mt-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cashFlowMix} dataKey="value" innerRadius={52} outerRadius={84} paddingAngle={4}>
                      {cashFlowMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [formatCurrency(Number(value ?? 0)), "Amount"]} />
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Revenue breakdown</h2>
                  <p className="text-sm text-slate-500">Major fee streams</p>
                </div>
                <div className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Annualized</div>
              </div>

              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueBreakdown} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={56} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(val) => `Rs. ${Number(val) / 1000}k`} />
                    <Tooltip formatter={(value: any) => [formatCurrency(Number(value ?? 0)), "Revenue"]} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {revenueBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Expense allocation</h2>
                  <p className="text-sm text-slate-500">Operational spending mix</p>
                </div>
                <div className="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">Monthly</div>
              </div>

              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBreakdown} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={56} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(val) => `Rs. ${Number(val) / 1000}k`} />
                    <Tooltip formatter={(value: any) => [formatCurrency(Number(value ?? 0)), "Expense"]} />
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Recent transactions</h2>
                  <p className="text-sm text-slate-500">Latest fee collections and financial activity</p>
                </div>
                <Link to="/finance/billing" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                  <Plus size={16} />
                  New invoice
                </Link>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
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
                      recentTransactions.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700 text-sm">{entry.type}</td>
                          <td className="px-4 py-3 text-slate-700 text-sm max-w-xs truncate">{entry.description}</td>
                          <td className={`px-4 py-3 font-semibold text-sm ${entry.positive ? "text-emerald-700" : "text-rose-700"}`}>
                            {entry.positive ? "+" : "-"}{formatCurrency(Math.abs(entry.amount))}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                              entry.status === "Paid" ? "bg-emerald-50 text-emerald-700" :
                              entry.status === "Recorded" ? "bg-blue-50 text-blue-700" :
                              "bg-amber-50 text-amber-700"
                            }`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-sm">{entry.time}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Profit & loss</h2>
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

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Finance tools</h2>
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