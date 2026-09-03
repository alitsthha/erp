import { useState } from "react";
import { Loader2 } from "lucide-react";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";
import { getCurrentBSDate } from "@/utils/nepali-date";

import type {
  Income,
  IncomeFormData,
} from "../types/income.types";

const TODAY = getCurrentBSDate();

const CATEGORIES = ["Student Fee", "Student Fee (Advance)"] as const;

interface IncomeFormProps {
  initialData?: Income;
  onSubmit: (data: IncomeFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function IncomeForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: IncomeFormProps) {
  const [category, setCategory] = useState<IncomeFormData["category"]>(
    initialData?.category ?? "Student Fee",
  );
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [amount, setAmount] = useState(initialData?.amount ?? 0);
  const [incomeDate, setIncomeDate] = useState(initialData?.incomeDate ?? TODAY);
  const [source, setSource] = useState(initialData?.source ?? "");
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod ?? "Cash");
  const [referenceNumber, setReferenceNumber] = useState(initialData?.referenceNumber ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const isAdvance = category === "Student Fee (Advance)";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    await onSubmit({
      category,
      description: description || (isAdvance ? "Student fee advance" : "Student fee payment"),
      amount: Number(amount),
      incomeDate,
      source: source || undefined,
      paymentMethod: paymentMethod || undefined,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as IncomeFormData["category"])}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          >
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <NepaliDatePickerInput label="Income Date" value={incomeDate} onChange={setIncomeDate} required />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Description {isAdvance ? "" : <span className="text-red-500">*</span>}
        </label>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder={isAdvance ? "Advance payment for selected student" : "Student fee collection or camp income"}
          required={!isAdvance}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Amount (Rs.) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Source
          </label>
          <input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Student, school, event, donor"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
            <option value="Online">Online</option>
            <option value="Card">Card</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Reference Number
          </label>
          <input
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Receipt / transaction ID"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="Additional notes..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={15} className="animate-spin" />}
          {isSubmitting ? "Saving..." : initialData ? "Update Income" : "Add Income"}
        </button>
      </div>
    </form>
  );
}
