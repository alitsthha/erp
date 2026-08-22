import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Payment } from "../types/payment.types";
import type { Invoice } from "../types/invoice.types";
import { formatCurrency } from "@/utils/currency";
import { getCurrentBSDate } from "@/utils/nepali-date";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";

const TODAY = getCurrentBSDate();

interface PaymentFormProps {
  invoice: Invoice;
  onSubmit: (data: Omit<Payment, "id" | "paymentNumber" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function PaymentForm({
  invoice,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: PaymentFormProps) {
  const [amount, setAmount] = useState(invoice.dueAmount ?? invoice.totalAmount ?? 0);
  const [paymentDate, setPaymentDate] = useState(TODAY);
  const [paymentMethod, setPaymentMethod] = useState<Payment["paymentMethod"]>("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await onSubmit({
      invoiceId: invoice.id ?? "",
      invoiceNumber: invoice.invoiceNumber,
      studentId: invoice.studentId,
      studentName: invoice.studentName,
      studentCode: invoice.studentCode,
      amount: Number(amount),
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
    });
  }

  const maxAmount = invoice.dueAmount ?? invoice.totalAmount ?? 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Invoice Summary */}
      <div className="rounded-xl bg-slate-50 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-400">Invoice</p>
            <p className="font-mono font-semibold text-slate-900">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Student</p>
            <p className="font-medium text-slate-900">{invoice.studentName}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Invoice Total</p>
            <p className="font-semibold text-slate-900">{formatCurrency(invoice.totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Amount Due</p>
            <p className="font-bold text-orange-700">{formatCurrency(invoice.dueAmount)}</p>
          </div>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Payment Amount (Rs.) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="1"
          max={maxAmount}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          required
        />
        <p className="mt-1 text-xs text-slate-400">
          Maximum: {formatCurrency(maxAmount)}
        </p>
      </div>

      {/* Date + Method */}
      <div className="grid gap-4 sm:grid-cols-2">
        <NepaliDatePickerInput label="Payment Date" value={paymentDate} onChange={setPaymentDate} required />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as Payment["paymentMethod"])}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          >
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
            <option value="Online">Online</option>
            <option value="Card">Card</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Reference + Notes */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Reference Number
          </label>
          <input
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Cheque / transaction ID..."
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
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={15} className="animate-spin" />}
          {isSubmitting ? "Recording..." : "Record Payment"}
        </button>
      </div>
    </form>
  );
}
