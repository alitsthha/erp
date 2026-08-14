import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import type { Payment } from "../types/payment.types";

const METHOD_STYLES: Record<string, string> = {
  Cash: "bg-emerald-50 text-emerald-700",
  Bank: "bg-blue-50 text-blue-700",
  Online: "bg-purple-50 text-purple-700",
  Card: "bg-orange-50 text-orange-700",
  Other: "bg-slate-100 text-slate-600",
};

interface PaymentTableProps {
  payments: Payment[];
  isLoading?: boolean;
  onDelete?: (paymentId: string) => void;
}

export default function PaymentTable({
  payments,
  isLoading = false,
  onDelete,
}: PaymentTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">No payments recorded</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[700px] w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment #
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invoice
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Student
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Method
              </th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Amount
              </th>
              {onDelete && (
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="transition hover:bg-slate-50/70"
              >
                <td className="px-5 py-4">
                  <span className="font-mono text-sm font-semibold text-slate-900">
                    {payment.paymentNumber}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <span className="font-mono text-xs text-slate-600">
                    {payment.invoiceNumber}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-slate-900">
                    {payment.studentName}
                  </p>
                  <p className="font-mono text-xs text-slate-400">
                    {payment.studentCode}
                  </p>
                </td>

                <td className="px-5 py-4 text-sm text-slate-700">
                  {payment.paymentDate}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${METHOD_STYLES[payment.paymentMethod] ?? METHOD_STYLES.Other}`}
                  >
                    {payment.paymentMethod}
                  </span>
                </td>

                <td className="px-5 py-4 text-right">
                  <span className="font-semibold text-emerald-700">
                    {formatCurrency(payment.amount)}
                  </span>
                </td>

                {onDelete && (
                  <td className="px-5 py-4 text-right">
                    {payment.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete payment ${payment.paymentNumber}?`
                            )
                          ) {
                            onDelete(payment.id!);
                          }
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
