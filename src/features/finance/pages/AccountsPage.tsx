import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Plus } from "lucide-react";

export default function AccountsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
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

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <BookOpen size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Chart of Accounts
                </h1>

                <p className="mt-1 text-sm text-slate-500 sm:text-base">
                  Manage income, expense, asset, liability, and equity accounts.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
          >
            <Plus size={18} />
            Add Account
          </button>
        </div>

        {/* Empty State */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <BookOpen size={30} className="text-slate-500" />
            </div>

            <h2 className="text-lg font-semibold text-slate-900">
              No accounts yet
            </h2>

            <p className="mt-2 max-w-md text-sm text-slate-500">
              Create your chart of accounts to organize income, expenses,
              assets, liabilities, and equity.
            </p>

            <button
              type="button"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={18} />
              Create First Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}