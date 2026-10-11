import PaginatedList from "@/components/common/PaginatedList";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";

import { formatCurrency } from "@/utils/currency";
import { formatBSDate } from "@/utils/nepali-date";
import type { Invoice } from "../types/invoice.types";

const STATUS_STYLES: Record<
  Invoice["status"],
  { label: string; className: string; icon: React.ReactNode }
> = {
  Draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600",
    icon: <MoreHorizontal size={12} />,
  },
  Unpaid: {
    label: "Unpaid",
    className: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    icon: <Clock size={12} />,
  },
  "Partially Paid": {
    label: "Partial",
    className: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
    icon: <CreditCard size={12} />,
  },
  Paid: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    icon: <CheckCircle2 size={12} />,
  },
  Cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-600 ring-1 ring-red-200",
    icon: <XCircle size={12} />,
  },
  "Sent (Mail)": {
    label: "Sent (Mail)",
    className: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    icon: <CheckCircle2 size={12} />,
  },
  "Sent (WhatsApp)": {
    label: "Sent (WhatsApp)",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    icon: <CheckCircle2 size={12} />,
  },
};

interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading?: boolean;
  onView?: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoiceId: string) => void;
  onRecordPayment?: (invoice: Invoice) => void;
}

export default function InvoiceTable({
  invoices,
  isLoading = false,
  onView,
  onEdit,
  onDelete,
  onRecordPayment,
}: InvoiceTableProps) {
  if (isLoading) {
    return (
      <div className="ui-surface">
        <div className="space-y-3 p-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="ui-surface p-10 text-center">
        <p className="text-sm font-medium text-slate-500">No invoices found</p>
        <p className="mt-1 text-xs text-slate-400">
          Generate invoices from attendance or create them manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Desktop */}
      <div className="ui-surface hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="ui-table min-w-[900px]">
            <thead className="ui-table-head border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Invoice
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Student
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Paid
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Due
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {<PaginatedList items={invoices} table>{(invoice) => {
                const style = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.Unpaid;

                return (
                  <tr
                    key={invoice.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm font-semibold text-slate-900">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-xs text-slate-400">{formatBSDate(invoice.invoiceDate)}</p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">
                        {invoice.studentName}
                      </p>
                      <p className="font-mono text-xs text-slate-400">
                        {invoice.studentCode}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(invoice.totalAmount)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="text-emerald-700 font-medium">
                        {formatCurrency(invoice.paidAmount)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          invoice.dueAmount > 0
                            ? "font-semibold text-orange-700"
                            : "text-slate-400"
                        }
                      >
                        {formatCurrency(invoice.dueAmount)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}
                      >
                        {style.icon}
                        {style.label}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {onView && (
                          <button
                            type="button"
                            onClick={() => onView(invoice)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <Eye size={13} />
                            View
                          </button>
                        )}

                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(invoice)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            title="Edit invoice"
                          >
                            <Pencil size={13} />
                          </button>
                        )}

                        {onRecordPayment &&
                          invoice.status !== "Paid" &&
                          invoice.status !== "Cancelled" && (
                            <button
                              type="button"
                              onClick={() => onRecordPayment(invoice)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <CreditCard size={13} />
                              Pay
                            </button>
                          )}

                        {onDelete && invoice.id && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete invoice ${invoice.invoiceNumber}?`
                                )
                              ) {
                                onDelete(invoice.id!);
                              }
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }}</PaginatedList>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {<PaginatedList items={invoices}>{(invoice) => {
          const style = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.Unpaid;

          return (
            <div
              key={invoice.id}
              className="ui-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-slate-900">
                    {invoice.invoiceNumber}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {invoice.studentName}
                  </p>
                  <p className="text-xs text-slate-400">{formatBSDate(invoice.invoiceDate)}</p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}
                >
                  {style.icon}
                  {style.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 p-2 text-center">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {formatCurrency(invoice.totalAmount)}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2 text-center">
                  <p className="text-xs text-emerald-600">Paid</p>
                  <p className="mt-0.5 text-sm font-bold text-emerald-700">
                    {formatCurrency(invoice.paidAmount)}
                  </p>
                </div>
                <div className="rounded-xl bg-orange-50 p-2 text-center">
                  <p className="text-xs text-orange-600">Due</p>
                  <p className="mt-0.5 text-sm font-bold text-orange-700">
                    {formatCurrency(invoice.dueAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {onView && (
                  <button
                    type="button"
                    onClick={() => onView(invoice)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-700"
                  >
                    <Eye size={13} />
                    View
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(invoice)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
                    title="Edit invoice"
                  >
                    <Pencil size={13} />
                  </button>
                )}
                {onRecordPayment &&
                  invoice.status !== "Paid" &&
                  invoice.status !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={() => onRecordPayment(invoice)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-xs font-medium text-emerald-700"
                    >
                      <CreditCard size={13} />
                      Pay
                    </button>
                  )}
                {onDelete && invoice.id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete invoice ${invoice.invoiceNumber}?`)) {
                        onDelete(invoice.id!);
                      }
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        }}</PaginatedList>}
      </div>
    </div>
  );
}
