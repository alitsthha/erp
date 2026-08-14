import { useState } from "react";
import { Loader2, Sparkles, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import { calculateStudentMonthlyFee } from "../services/fee-calculation.service";
import type { Invoice, InvoiceLine } from "../types/invoice.types";

interface Student {
  id: string;
  studentCode: string;
  fullName: string;
}

interface InvoiceFormProps {
  students: Student[];
  onSubmit: (data: Omit<Invoice, "id" | "invoiceNumber" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function InvoiceForm({
  students,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: InvoiceFormProps) {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [billingMonth, setBillingMonth] = useState(TODAY.slice(0, 7));
  const [invoiceDate, setInvoiceDate] = useState(TODAY);
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const subtotal = lines.reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalAmount = Math.max(subtotal - (discount || 0), 0);
  const paidAmount = 0;
  const dueAmount = totalAmount;

  function handleStudentChange(id: string) {
    const student = students.find((s) => s.id === id);
    setStudentId(id);
    setStudentName(student?.fullName ?? "");
    setStudentCode(student?.studentCode ?? "");
  }

  async function handleGenerateFromAttendance() {
    if (!studentId) {
      setGenerateError("Please select a student first.");
      return;
    }
    if (!billingMonth) {
      setGenerateError("Please select a billing month first.");
      return;
    }

    setGenerateError("");
    setIsGenerating(true);

    try {
      const feeSummary = await calculateStudentMonthlyFee(studentId, billingMonth);

      const mappedLines: InvoiceLine[] = feeSummary.lines.map((line) => ({
        enrollmentId: line.enrollmentId,
        activityId: line.activityId,
        activityName: line.activityName,
        activityCode: line.activityCode,
        monthlyFee: Number(line.monthlyFee || 0),
        expectedSessions: Number(line.expectedSessions || 0),
        sessionCount: Number(line.attendedSessions || 0),
        sessionFee: Number(line.sessionFee || 0),
        amount: Number(line.calculatedAmount || 0),
      }));

      setLines(mappedLines);

      if (mappedLines.length === 0) {
        setGenerateError(
          "No Present attendance found for this student in the selected month."
        );
      }
    } catch (err) {
      console.error(err);
      setGenerateError("Failed to generate invoice. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  function updateLine(index: number, field: keyof InvoiceLine, value: string | number) {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[index], [field]: value };

      /* Auto-recalculate amount */
      line.amount = (Number(line.sessionCount) || 0) * (Number(line.sessionFee) || 0);
      next[index] = line;

      return next;
    });
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        activityName: "",
        monthlyFee: 0,
        expectedSessions: 0,
        sessionCount: 0,
        sessionFee: 0,
        amount: 0,
      },
    ]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!studentId || !billingMonth || lines.length === 0) return;

    await onSubmit({
      studentId,
      studentName,
      studentCode,
      billingMonth,
      invoiceDate,
      dueDate: dueDate || undefined,
      lines,
      subtotal,
      discount: discount || 0,
      totalAmount,
      paidAmount,
      dueAmount,
      status: "Unpaid",
      notes: notes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Student + Month */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Student <span className="text-red-500">*</span>
          </label>
          <select
            value={studentId}
            onChange={(e) => handleStudentChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          >
            <option value="">Select student...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.studentCode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Billing Month <span className="text-red-500">*</span>
          </label>
          <input
            type="month"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>
      </div>

      {/* Generate from Attendance button */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-900">
              Auto-generate from Attendance
            </p>
            <p className="mt-0.5 text-xs text-blue-600">
              Reads attendance records and fills line items based on sessions attended.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateFromAttendance}
            disabled={isGenerating || !studentId || !billingMonth}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {isGenerating ? "Generating..." : "Generate Lines"}
          </button>
        </div>

        {generateError && (
          <p className="mt-2 text-xs font-medium text-red-600">{generateError}</p>
        )}
      </div>

      {/* Invoice Date + Due Date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Invoice Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">
            Line Items <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={13} />
            Add Row
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
            No lines yet. Click "Generate Lines" or "Add Row".
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-[600px] w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Activity
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                    Sessions
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Session Fee
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Amount
                  </th>
                  <th className="w-10 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">
                      <input
                        value={line.activityName}
                        onChange={(e) => updateLine(i, "activityName", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
                        placeholder="Activity name"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        value={line.sessionCount}
                        onChange={(e) => updateLine(i, "sessionCount", Number(e.target.value))}
                        className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-center text-sm outline-none focus:border-blue-400"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.sessionFee}
                        onChange={(e) => updateLine(i, "sessionFee", Number(e.target.value))}
                        className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-right text-sm outline-none focus:border-blue-400"
                      />
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(line.amount || 0)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Discount + Notes */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Discount (Rs.)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Notes
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Optional notes..."
          />
        </div>
      </div>

      {/* Totals Summary */}
      {lines.length > 0 && (
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Discount</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-base">
              <span>Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting || lines.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={15} className="animate-spin" />}
          {isSubmitting ? "Saving..." : "Create Invoice"}
        </button>
      </div>
    </form>
  );
}
