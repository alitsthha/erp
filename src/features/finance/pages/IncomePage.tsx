import SearchableSelect from "@/components/forms/SearchableSelect";
import PaginatedList from "@/components/common/PaginatedList";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, TrendingUp, Wallet } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import ListSkeleton from "@/components/common/ListSkeleton";
import ListToolbar from "@/components/common/ListToolbar";
import { getCurrentBSDate } from "@/utils/nepali-date";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";
import { getStudentsForEnrollment } from "@/features/enrollments/services/enrollment.service";
import type { Student } from "@/features/students/types/student.types";

import { createIncome, getIncomes } from "../services/income.service";
import type { Income, IncomeCategory } from "../types/income.types";

const formatCurrency = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

export default function IncomePage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<Income[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>("Student Fee (Advance)");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState(getCurrentBSDate());
  const [paymentMethod, setPaymentMethod] = useState("Cash");

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

  async function loadStudents() {
    try {
      const result = await getStudentsForEnrollment();
      setStudents(result);
    } catch (err) {
      console.error("Failed to load students:", err);
    }
  }

  useEffect(() => {
    void loadData();
    void loadStudents();
  }, []);

  async function handleAddIncome(event: React.FormEvent) {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Income amount must be greater than zero.");
      return;
    }

    if (!selectedStudentId) {
      setError("Please select a student for the advance payment.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const student = students.find((item) => item.id === selectedStudentId);
      await createIncome({
        category: "Student Fee (Advance)",
        description: `Student fee advance for ${student?.fullName ?? "student"}`,
        amount: numericAmount,
        incomeDate,
        source: student ? student.fullName : "Student",
        studentId: selectedStudentId,
        studentName: student?.fullName,
        paymentMethod,
        notes: `Advance received from ${student?.fullName ?? "student"}. This amount will be deducted automatically from future invoice totals.`,
      });

      setSuccess("Income recorded successfully.");
      setIncomeCategory("Student Fee (Advance)");
      setSelectedStudentId("");
      setAmount("");
      setIncomeDate(getCurrentBSDate());
      setPaymentMethod("Cash");
      await loadData();
    } catch (err) {
      console.error("Failed to save income:", err);
      setError(err instanceof Error ? err.message : "Unable to save income.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalIncome = useMemo(
    () => records.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    [records],
  );

  const studentFeeIncome = useMemo(
    () =>
      records
        .filter((item) => item.category === "Student Fee" || item.category === "Student Fee (Advance)")
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
      <div className="ui-page mx-auto w-full">
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

            <h1 className="ui-page-title">Income</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage student fee income and payment records.
            </p>
          </div>

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
          <div className="ui-surface p-5">
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

          <div className="ui-surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Student Fees</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(studentFeeIncome)}</p>
              </div>
              <div className="rounded-xl bg-brand-100 p-3 text-brand-700">
                <Wallet size={22} />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800">
          Student-fee income is recorded automatically when an invoice payment is received. Student advances are stored as advance payments and are deducted automatically from future generated bills.
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <form onSubmit={handleAddIncome} className="ui-surface p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-brand-600 p-2.5 text-white">
                <Plus size={18} />
              </div>
              <div>
                <h2 className="ui-section-title">Add Income</h2>
                <p className="text-sm text-slate-500">Record a new student advance payment</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
                  <SearchableSelect
                    value={incomeCategory}
                    onChange={(event) => setIncomeCategory(event.target.value as IncomeCategory)}
                    className="ui-field w-full px-3 text-slate-900 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="Student Fee (Advance)">Student Fee (Advance)</option>
                  </SearchableSelect>
                </div>

                <NepaliDatePickerInput label="Date" value={incomeDate} onChange={setIncomeDate} required />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Student</label>
                <SearchableSelect
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  className="ui-field w-full px-3 text-slate-900 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>{student.fullName} — {student.studentCode}</option>
                  ))}
                </SearchableSelect>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount (Rs.)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="1000"
                    className="ui-field w-full px-3 text-slate-900 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment Method</label>
                  <SearchableSelect
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="ui-field w-full px-3 text-slate-900 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Online">Online</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </SearchableSelect>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Source</label>
                <input
                  type="text"
                  value={selectedStudentId ? (students.find((student) => student.id === selectedStudentId)?.fullName ?? "") : ""}
                  readOnly
                  className="ui-field w-full bg-slate-50 px-3 text-slate-900 shadow-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setSelectedStudentId("");
                    setAmount("");
                    setIncomeDate(getCurrentBSDate());
                    setPaymentMethod("Cash");
                  }}
                  className="ui-button border border-slate-200 bg-white py-2.5 text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ui-button bg-brand-600 py-2.5 text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Income"}
                </button>
              </div>
            </div>
          </form>

          <div className="ui-surface p-4 sm:p-6">
            <ListToolbar
              search={search}
              onSearchChange={setSearch}
              placeholder="Search description, source, or reference..."
              resultCount={filteredRecords.length}
              onClear={() => {
                setSearch("");
                setCategoryFilter("all");
              }}
              filter={
                <SearchableSelect
                  aria-label="Filter income by category"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="ui-field w-full px-3"
                >
                  <option value="all">All categories</option>
                  <option value="Student Fee">Student Fee</option>
                  <option value="Student Fee (Advance)">Student Fee (Advance)</option>
                </SearchableSelect>
              }
            />
            {loading ? (
              <ListSkeleton rows={5} columns={5} />
            ) : filteredRecords.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title={records.length === 0 ? "No income records yet" : "No matching income records"}
                description={records.length === 0 ? "Add the first income entry to begin tracking receipts." : "Try a different search term or category."}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="ui-table">
                  <thead className="ui-table-head">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {<PaginatedList showSort={false} items={filteredRecords} table>{(record) => (
                      <tr key={record.id ?? record.incomeNumber} className="border-t border-slate-200">
                        <td className="px-4 py-3 text-slate-700">{record.incomeDate}</td>
                        <td className="px-4 py-3 text-slate-700">{record.category}</td>
                        <td className="px-4 py-3 text-slate-700">{record.description}</td>
                        <td className="px-4 py-3 text-slate-700">{record.source ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(record.amount ?? 0)}</td>
                      </tr>
                    )}</PaginatedList>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}