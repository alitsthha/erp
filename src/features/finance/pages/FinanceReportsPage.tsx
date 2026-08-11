import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  FileBarChart,
} from "lucide-react";

export default function FinanceReportsPage() {
  const navigate = useNavigate();

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

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Finance Reports
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Analyze income, expenses, profit, cash flow, and outstanding
            balances.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Profit & Loss",
            "Income Report",
            "Expense Report",
            "Outstanding",
            "Cash Flow",
            "Monthly Summary",
          ].map((report) => (
            <div
              key={report}
              className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <FileBarChart
                size={24}
                className="mb-4 text-blue-600"
              />

              <h2 className="font-semibold text-slate-900">
                {report}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                View {report.toLowerCase()} information.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
            <BarChart3
              size={34}
              className="mb-4 text-slate-400"
            />

            <h2 className="text-lg font-semibold">
              Financial reporting
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Reports will automatically calculate from Finance transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}