import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Calculator } from "lucide-react";

import { getExpenses } from "../services/expense.service";
import { getFinanceSummary } from "../services/finance.service";
import { getInvoices } from "../services/invoice.service";
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

export default function AccountingPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<FinanceSummary>(initialSummary);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [financeSummary, invoiceList, expenseList] = await Promise.all([
          getFinanceSummary(),
          getInvoices(),
          getExpenses(),
        ]);

        setSummary(financeSummary);
        setInvoices(invoiceList.slice(0, 6));
        setExpenses(expenseList.slice(0, 6));
      } catch (error) {
        console.error("Failed to load accounting data:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const ledgerRows = [
    ...invoices.map((invoice) => ({
      type: "Invoice",
      ref: invoice.invoiceNumber,
      date: invoice.invoiceDate,
      name: invoice.studentName ?? "Student",
      amount: Number(invoice.totalAmount ?? 0),
    })),
    ...expenses.map((expense) => ({
      type: "Expense",
      ref: expense.expenseNumber,
      date: expense.expenseDate,
      name: expense.description ?? "Expense",
      amount: Number(expense.amount ?? 0),
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

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

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Accounting</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Manage transactions, journal entries, accounts, and cash/bank records.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <BookOpen size={22} className="mb-4 text-blue-600" />
            <p className="text-sm text-slate-500">Income</p>
            <p className="mt-2 text-2xl font-bold">Rs. {summary.totalIncome.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Calculator size={22} className="mb-4 text-red-600" />
            <p className="text-sm text-slate-500">Expenses</p>
            <p className="mt-2 text-2xl font-bold">Rs. {summary.totalExpenses.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <BookOpen size={22} className="mb-4 text-emerald-600" />
            <p className="text-sm text-slate-500">Cash</p>
            <p className="mt-2 text-2xl font-bold">Rs. {summary.cashBalance.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Calculator size={22} className="mb-4 text-violet-600" />
            <p className="text-sm text-slate-500">Outstanding</p>
            <p className="mt-2 text-2xl font-bold">Rs. {summary.outstandingAmount.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">
              Loading accounting ledger...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Reference</th>
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((row, index) => (
                    <tr key={`${row.type}-${row.ref}-${index}`} className="border-t border-slate-200">
                      <td className="px-3 py-3 text-slate-700">{row.type}</td>
                      <td className="px-3 py-3 text-slate-700">{row.ref}</td>
                      <td className="px-3 py-3 text-slate-700">{row.date}</td>
                      <td className="px-3 py-3 text-slate-700">{row.name}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-900">Rs. {Number(row.amount ?? 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}