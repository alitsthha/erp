import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Calculator,
} from "lucide-react";

export default function AccountingPage() {
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
            Accounting
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Manage transactions, journal entries, accounts, and cash/bank
            records.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <BookOpen size={24} className="mb-4 text-blue-600" />

            <h2 className="text-lg font-semibold text-slate-900">
              Transactions
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Record and manage financial transactions.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <Calculator size={24} className="mb-4 text-green-600" />

            <h2 className="text-lg font-semibold text-slate-900">
              Journal
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Manage accounting journal entries and adjustments.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
            <BookOpen size={32} className="mb-4 text-slate-400" />

            <h2 className="text-lg font-semibold">
              Accounting module
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Transaction and journal functionality will be connected
              to the Finance module.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}