import SearchableSelect from "@/components/forms/SearchableSelect";
import PaginatedList from "@/components/common/PaginatedList";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Receipt,
  TrendingDown,
} from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import ListSkeleton from "@/components/common/ListSkeleton";
import ListToolbar from "@/components/common/ListToolbar";

import { getCurrentBSDate } from "@/utils/nepali-date";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";

import { createExpense, getExpenses } from "../services/expense.service";
import type { Expense, ExpenseCategory } from "../types/expense.types";

const expenseCategories: ExpenseCategory[] = [
  "Rent",
  "Utilities",
  "Salaries",
  "Food",
  "Transport",
  "Equipment",
  "Marketing",
  "Maintenance",
  "Office Supplies",
  "Other",
];

const initialForm = {
  category: "Other" as ExpenseCategory,
  description: "",
  amount: "",
  expenseDate: getCurrentBSDate(),
  vendor: "",
  paymentMethod: "Cash",
  referenceNumber: "",
  notes: "",
};

function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

export default function ExpensesPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadExpenses() {
    try {
      setLoading(true);
      const result = await getExpenses();
      setExpenses(result);
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadExpenses();
  }, []);

  const filteredExpenses = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return expenses;

    return expenses.filter((expense) => {
      const haystack = [
        expense.description,
        expense.category,
        expense.vendor ?? "",
        expense.referenceNumber ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(value);
    }).filter((expense) => categoryFilter === "all" || expense.category === categoryFilter);
  }, [expenses, search, categoryFilter]);

  const totalExpenses = expenses.reduce((total, item) => total + (item.amount ?? 0), 0);
  const thisMonthExpenses = expenses.filter((item) => {
    const month = new Date(item.expenseDate).toISOString().slice(0, 7);
    return month === new Date().toISOString().slice(0, 7);
  }).reduce((total, item) => total + item.amount, 0);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.description.trim() || !form.amount || Number(form.amount) <= 0) {
      setError("Please enter a valid description and amount.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      await createExpense({
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        vendor: form.vendor.trim() || undefined,
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });

      setForm(initialForm);
      setSuccess("Expense recorded successfully.");
      await loadExpenses();
    } catch (err) {
      console.error("Failed to create expense:", err);
      setError(err instanceof Error ? err.message : "Unable to save expense.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="ui-page mx-auto w-full">
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

            <h1 className="ui-page-title">
              Daily Expenses
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Record daily operating expenses and keep the finance ledger current.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="ui-surface p-5">
            <p className="text-sm text-slate-500">Total Expenses</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalExpenses)}</p>
              <div className="rounded-xl bg-red-100 p-3 text-red-700">
                <TrendingDown size={22} />
              </div>
            </div>
          </div>

          <div className="ui-surface p-5">
            <p className="text-sm text-slate-500">This Month</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(thisMonthExpenses)}</p>
          </div>

          <div className="ui-surface p-5">
            <p className="text-sm text-slate-500">Transactions</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{expenses.length}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <form onSubmit={handleSubmit} className="ui-surface p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-brand-600 p-2.5 text-white">
                <Plus size={18} />
              </div>
              <div>
                <h2 className="ui-section-title">Add Expense</h2>
                <p className="text-sm text-slate-500">Record a new daily expense entry</p>
              </div>
            </div>

            <div className="space-y-4">
              <NepaliDatePickerInput label="Date" value={form.expenseDate} onChange={(value) => setForm((current) => ({ ...current, expenseDate: value }))} required />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
                <SearchableSelect
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ExpenseCategory }))}
                  className="ui-field w-full bg-slate-50 px-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  {expenseCategories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </SearchableSelect>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <input
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Rent, staff meals, electricity, etc."
                  className="ui-field w-full bg-slate-50 px-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  placeholder="0.00"
                  className="ui-field w-full bg-slate-50 px-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Vendor / Payee</label>
                <input
                  value={form.vendor}
                  onChange={(event) => setForm((current) => ({ ...current, vendor: event.target.value }))}
                  placeholder="Optional"
                  className="ui-field w-full bg-slate-50 px-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment Method</label>
                  <SearchableSelect
                    value={form.paymentMethod}
                    onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                    className="ui-field w-full bg-slate-50 px-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Online">Online</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </SearchableSelect>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Reference</label>
                  <input
                    value={form.referenceNumber}
                    onChange={(event) => setForm((current) => ({ ...current, referenceNumber: event.target.value }))}
                    placeholder="Optional"
                    className="ui-field w-full bg-slate-50 px-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                  placeholder="Optional details"
                  className="ui-field w-full bg-slate-50 px-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="ui-button inline-flex w-full items-center justify-center gap-2 bg-brand-600 py-3 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={18} />
                {submitting ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </form>

          <div className="ui-surface p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="ui-section-title">Expense Ledger</h2>
                <p className="text-sm text-slate-500">Recent daily expenses</p>
              </div>

            </div>

            <ListToolbar search={search} onSearchChange={setSearch} placeholder="Search description, vendor, or reference..." resultCount={filteredExpenses.length} onClear={() => { setSearch(""); setCategoryFilter("all"); }} filter={<SearchableSelect aria-label="Filter expenses by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="ui-field w-full px-3"><option value="all">All categories</option>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</SearchableSelect>} />

            {loading ? (
              <ListSkeleton rows={5} columns={4} />
            ) : filteredExpenses.length === 0 ? (
              <EmptyState icon={Receipt} title={expenses.length === 0 ? "No expense records yet" : "No matching expenses"} description={expenses.length === 0 ? "Record the first operating expense using the form." : "Try a different search term or category."} />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="ui-table">
                    <thead className="ui-table-head">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 font-semibold">Description</th>
                        <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {<PaginatedList showSort={false} items={filteredExpenses} table>{(expense) => (
                        <tr key={expense.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700">{expense.expenseDate}</td>
                          <td className="px-4 py-3 text-slate-700">{expense.category}</td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="font-medium text-slate-900">{expense.description}</div>
                            {expense.vendor && <div className="text-xs text-slate-400">{expense.vendor}</div>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      )}</PaginatedList>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}