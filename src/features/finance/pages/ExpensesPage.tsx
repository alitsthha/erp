import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Receipt,
  TrendingDown,
} from "lucide-react";

export default function ExpensesPage() {
  const navigate = useNavigate();

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

            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Expenses
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Track rent, salaries, utilities, transportation, equipment,
              and other expenses.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
          >
            <Plus size={18} />
            Add Expense
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Expenses
            </p>

            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-bold text-slate-900">
                Rs. 0
              </p>

              <div className="rounded-xl bg-red-100 p-3 text-red-700">
                <TrendingDown size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              This Month
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              Rs. 0
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <p className="text-sm text-slate-500">
              Transactions
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              0
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
            <Receipt size={32} className="mb-4 text-slate-400" />

            <h2 className="text-lg font-semibold text-slate-900">
              No expense records
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Expense transactions will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}