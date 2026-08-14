import { Edit, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import type { Expense } from "../types/expense.types";

const CATEGORY_STYLES: Record<string, string> = {
  Rent: "bg-purple-50 text-purple-700",
  Utilities: "bg-blue-50 text-blue-700",
  Salaries: "bg-orange-50 text-orange-700",
  Food: "bg-green-50 text-green-700",
  Transport: "bg-yellow-50 text-yellow-700",
  Equipment: "bg-indigo-50 text-indigo-700",
  Marketing: "bg-pink-50 text-pink-700",
  Maintenance: "bg-slate-100 text-slate-700",
  "Office Supplies": "bg-cyan-50 text-cyan-700",
  Other: "bg-slate-100 text-slate-600",
};

interface ExpenseTableProps {
  expenses: Expense[];
  isLoading?: boolean;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expenseId: string) => void;
}

export default function ExpenseTable({
  expenses,
  isLoading = false,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">No expenses recorded</p>
        <p className="mt-1 text-xs text-slate-400">Add your first expense to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[700px] w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Expense #
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Category
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Description
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Vendor
              </th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Amount
              </th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className="transition hover:bg-slate-50/70"
              >
                <td className="px-5 py-4">
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {expense.expenseNumber}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_STYLES[expense.category] ?? CATEGORY_STYLES.Other}`}
                  >
                    {expense.category}
                  </span>
                </td>

                <td className="max-w-[200px] px-5 py-4">
                  <p className="truncate text-sm text-slate-900">
                    {expense.description}
                  </p>
                </td>

                <td className="px-5 py-4 text-sm text-slate-700">
                  {expense.expenseDate}
                </td>

                <td className="px-5 py-4 text-sm text-slate-500">
                  {expense.vendor || "—"}
                </td>

                <td className="px-5 py-4 text-right">
                  <span className="font-semibold text-red-700">
                    {formatCurrency(expense.amount)}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(expense)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Edit size={13} />
                        Edit
                      </button>
                    )}
                    {onDelete && expense.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete expense "${expense.description}"?`)) {
                            onDelete(expense.id!);
                          }
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
