import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Plus,
  Receipt,
} from "lucide-react";

export default function BillingPage() {
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
              Billing
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Manage invoices, payments, outstanding balances, and receipts.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
          >
            <Plus size={18} />
            Create Invoice
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <FileText className="mb-3 text-blue-600" size={22} />
            <p className="text-sm text-slate-500">
              Total Invoices
            </p>
            <p className="mt-2 text-2xl font-bold">
              0
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Receipt className="mb-3 text-green-600" size={22} />
            <p className="text-sm text-slate-500">
              Paid
            </p>
            <p className="mt-2 text-2xl font-bold">
              Rs. 0
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Receipt className="mb-3 text-orange-600" size={22} />
            <p className="text-sm text-slate-500">
              Outstanding
            </p>
            <p className="mt-2 text-2xl font-bold">
              Rs. 0
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Receipt className="mb-3 text-red-600" size={22} />
            <p className="text-sm text-slate-500">
              Overdue
            </p>
            <p className="mt-2 text-2xl font-bold">
              Rs. 0
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex min-h-[250px] flex-col items-center justify-center text-center">
            <FileText size={32} className="mb-4 text-slate-400" />

            <h2 className="text-lg font-semibold">
              No invoices
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Your invoices will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}