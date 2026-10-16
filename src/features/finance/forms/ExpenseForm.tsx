import SafeForm from "@/components/forms/SafeForm";
import SearchableSelect from "@/components/forms/SearchableSelect";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getCurrentBSDate } from "@/utils/nepali-date";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";
import type { Expense, ExpenseCategory, ExpenseFormData } from "../types/expense.types";


const CATEGORIES: ExpenseCategory[] = [
  "Rent",
  "Utilities",
  "Salaries",
  "Food",
  "Transport",
  "Equipment",
  "Marketing",
  "Maintenance",
  "Office Supplies",
  "Other",
];

interface ExpenseFormProps {
  initialData?: Expense;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ExpenseForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ExpenseFormProps) {
  const [category, setCategory] = useState<ExpenseCategory>(
    initialData?.category ?? "Other"
  );
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [amount, setAmount] = useState(initialData?.amount ?? 0);
  const [expenseDate, setExpenseDate] = useState(initialData?.expenseDate ?? getCurrentBSDate());
  const [vendor, setVendor] = useState(initialData?.vendor ?? "");
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod ?? "");
  const [referenceNumber, setReferenceNumber] = useState(
    initialData?.referenceNumber ?? ""
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await onSubmit({
      category,
      description,
      amount: Number(amount),
      expenseDate,
      vendor: vendor || undefined,
      paymentMethod: paymentMethod || undefined,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <SafeForm onSubmit={handleSubmit} className="space-y-6">

      {/* Category + Date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Category <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="ui-field w-full px-3 text-slate-900 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            required
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </SearchableSelect>
        </div>

        <NepaliDatePickerInput label="Date" value={expenseDate} onChange={setExpenseDate} required />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Description <span className="text-red-500">*</span>
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="ui-field w-full px-3 text-slate-900 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          placeholder="What was this expense for?"
          required
        />
      </div>

      {/* Amount + Vendor */}
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
            onChange={(e) => setAmount(Number(e.target.value))}
            className="ui-field w-full px-3 text-slate-900 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Vendor
          </label>
          <input
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="ui-field w-full px-3 text-slate-900 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            placeholder="Vendor or supplier name"
          />
        </div>
      </div>

      {/* Payment Method + Reference */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Payment Method
          </label>
          <SearchableSelect
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="ui-field w-full px-3 text-slate-900 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">Select method...</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
            <option value="Online">Online</option>
            <option value="Card">Card</option>
            <option value="Other">Other</option>
          </SearchableSelect>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Reference Number
          </label>
          <input
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="ui-field w-full px-3 text-slate-900 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            placeholder="Receipt / transaction ref"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="ui-field w-full px-3 text-slate-900 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          placeholder="Additional notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="ui-button border border-slate-200 bg-white py-2.5 text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="ui-button inline-flex items-center gap-2 bg-brand-600 py-2.5 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={15} className="animate-spin" />}
          {isSubmitting ? "Saving..." : initialData ? "Update Expense" : "Add Expense"}
        </button>
      </div>
    </SafeForm>
  );
}
