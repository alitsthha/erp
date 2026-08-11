import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Wallet,
} from "lucide-react";

export default function PayrollPage() {
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
            Payroll
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Manage staff salary calculations, deductions, and payslips.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Users size={22} className="mb-3 text-blue-600" />

            <p className="text-sm text-slate-500">
              Staff
            </p>

            <p className="mt-2 text-2xl font-bold">
              0
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Wallet size={22} className="mb-3 text-green-600" />

            <p className="text-sm text-slate-500">
              Gross Salary
            </p>

            <p className="mt-2 text-2xl font-bold">
              Rs. 0
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <Wallet size={22} className="mb-3 text-purple-600" />

            <p className="text-sm text-slate-500">
              Net Salary
            </p>

            <p className="mt-2 text-2xl font-bold">
              Rs. 0
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex min-h-[250px] flex-col items-center justify-center text-center">
            <Users size={32} className="mb-4 text-slate-400" />

            <h2 className="text-lg font-semibold">
              Payroll is ready to build
            </h2>

            <p className="mt-2 max-w-lg text-sm text-slate-500">
              Salary configuration, staff attendance, deductions,
              net salary calculation, and payslips will be managed here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}