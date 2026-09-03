import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Wallet } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import ListSkeleton from "@/components/common/ListSkeleton";
import ListToolbar from "@/components/common/ListToolbar";

import { getIncomes } from "../services/income.service";
import type { Income } from "../types/income.types";

const formatCurrency = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

export default function IncomePage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

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

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !keyword || `${record.description} ${record.source ?? ""} ${record.incomeNumber}`.toLowerCase().includes(keyword);
      return matchesSearch && (categoryFilter === "all" || record.category === categoryFilter);
    });
  }, [records, search, categoryFilter]);


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

        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
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

        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          Student-fee income is recorded automatically when an invoice payment is received.
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <ListToolbar search={search} onSearchChange={setSearch} placeholder="Search description, source, or reference..." resultCount={filteredRecords.length} onClear={() => { setSearch(""); setCategoryFilter("all"); }} filter={<select aria-label="Filter income by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">All categories</option><option value="Student Fee">Student Fee</option></select>} />
          {loading ? (
            <ListSkeleton rows={5} columns={5} />
          ) : filteredRecords.length === 0 ? (
            <EmptyState icon={TrendingUp} title={records.length === 0 ? "No income records yet" : "No matching income records"} description={records.length === 0 ? "Add the first income entry to begin tracking receipts." : "Try a different search term or category."} />
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
                  {filteredRecords.map((record) => (
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