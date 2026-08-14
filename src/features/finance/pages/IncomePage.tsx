import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, TrendingUp, Wallet } from "lucide-react";

import IncomeForm from "../forms/IncomeForm";
import { createIncome, getIncomes } from "../services/income.service";
import type { Income, IncomeFormData } from "../types/income.types";

const formatCurrency = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

export default function IncomePage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setRecords(await getIncomes());
    } catch (err) {
      console.error("Failed to load income records:", err);
      setError("Unable to load income records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const totalIncome = useMemo(
    () => records.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    [records],
  );

  const studentFeeIncome = useMemo(
    () =>
      records
        .filter((item) => item.category === "Student Fee")
        .reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    [records],
  );


  async function handleSubmit(data: IncomeFormData) {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      await createIncome(data);
      setShowForm(false);
      setSuccess("Income added successfully.");
      await loadData();
    } catch (err) {
      console.error("Failed to create income:", err);
      setError(err instanceof Error ? err.message : "Unable to save income.");
    } finally {
      setSubmitting(false);
    }
  }

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

            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Income</h1>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Manage student fee income and payment records.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm((current) => !current)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
          >
            <Plus size={18} />
            {showForm ? "Close Form" : "Add Income"}
          </button>
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

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Income</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="rounded-xl bg-green-100 p-3 text-green-700">
                <TrendingUp size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Student Fees</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(studentFeeIncome)}</p>
              </div>
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <Wallet size={22} />
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Add Income Record</h2>
            <IncomeForm
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              isSubmitting={submitting}
            />
          </div>
        )}

        <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">
              Loading income records...
            </div>
          ) : records.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <TrendingUp size={32} className="mb-4 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">No income records</h2>
              <p className="mt-2 text-sm text-slate-500">Income transactions will appear here once added.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Category</th>
                    <th className="px-3 py-3 font-medium">Description</th>
                    <th className="px-3 py-3 font-medium">Source</th>
                    <th className="px-3 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id ?? record.incomeNumber} className="border-t border-slate-200">
                      <td className="px-3 py-3 text-slate-700">{record.incomeDate}</td>
                      <td className="px-3 py-3 text-slate-700">{record.category}</td>
                      <td className="px-3 py-3 text-slate-700">{record.description}</td>
                      <td className="px-3 py-3 text-slate-700">{record.source ?? "—"}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-900">{formatCurrency(record.amount ?? 0)}</td>
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