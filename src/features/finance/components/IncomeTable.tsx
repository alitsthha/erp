import { Edit, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import type { Income } from "../types/income.types";

const CATEGORY_STYLES: Record<string, string> = {
  "Student Fee": "bg-emerald-50 text-emerald-700",
  Other: "bg-slate-100 text-slate-600",
};

interface IncomeTableProps {
  incomes: Income[];
  isLoading?: boolean;
  onEdit?: (income: Income) => void;
  onDelete?: (incomeId: string) => void;
}

export default function IncomeTable({
  incomes,
  isLoading = false,
  onEdit,
  onDelete,
}: IncomeTableProps) {
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

  if (incomes.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">No income records</p>
        <p className="mt-1 text-xs text-slate-400">Add your first income entry to get started.</p>
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
                Income #
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
                Source
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
            {incomes.map((income) => (
              <tr
                key={income.id}
                className="transition hover:bg-slate-50/70"
              >
                <td className="px-5 py-4">
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {income.incomeNumber}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_STYLES[income.category] ?? CATEGORY_STYLES.Other}`}
                  >
                    {income.category}
                  </span>
                </td>

                <td className="max-w-[200px] px-5 py-4">
                  <p className="truncate text-sm text-slate-900">
                    {income.description}
                  </p>
                </td>

                <td className="px-5 py-4 text-sm text-slate-700">
                  {income.incomeDate}
                </td>

                <td className="px-5 py-4 text-sm text-slate-500">
                  {income.source || "—"}
                </td>

                <td className="px-5 py-4 text-right">
                  <span className="font-semibold text-emerald-700">
                    {formatCurrency(income.amount)}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(income)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Edit size={13} />
                        Edit
                      </button>
                    )}
                    {onDelete && income.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete income "${income.description}"?`)) {
                            onDelete(income.id!);
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
