import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  FileText,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { formatCurrency } from "@/utils/currency";
import type { FinanceSummary as FinanceSummaryType } from "../types/finance.types";

interface FinanceSummaryProps {
  summary: FinanceSummaryType;
}

export default function FinanceSummary({ summary }: FinanceSummaryProps) {
  const cards = [
    {
      title: "Total Income",
      value: formatCurrency(summary.totalIncome),
      icon: ArrowUpCircle,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(summary.totalExpenses),
      icon: ArrowDownCircle,
      color: "text-red-600 bg-red-50",
    },
    {
      title: "Net Profit",
      value: formatCurrency(summary.netProfit),
      icon: TrendingUp,
      color:
        summary.netProfit >= 0
          ? "text-blue-600 bg-blue-50"
          : "text-red-600 bg-red-50",
    },
    {
      title: "Outstanding",
      value: formatCurrency(summary.outstandingAmount),
      description: `${summary.outstandingInvoices} unpaid invoices`,
      icon: FileText,
      color: "text-orange-600 bg-orange-50",
    },
    {
      title: "Cash Balance",
      value: formatCurrency(summary.cashBalance),
      icon: Wallet,
      color: "text-slate-600 bg-slate-100",
    },
    {
      title: "Bank Balance",
      value: formatCurrency(summary.bankBalance),
      icon: Banknote,
      color: "text-indigo-600 bg-indigo-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">
                  {card.title}
                </p>

                <p className="mt-2 break-words text-2xl font-bold text-slate-900">
                  {card.value}
                </p>

                {card.description && (
                  <p className="mt-1 text-xs text-slate-400">
                    {card.description}
                  </p>
                )}
              </div>

              <div className={`shrink-0 rounded-xl p-3 ${card.color}`}>
                <Icon size={20} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
