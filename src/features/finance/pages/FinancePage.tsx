import { useEffect, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  FileText,
  Loader2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  getFinanceSummary,
} from "../services/finance.service";

import type {
  FinanceSummary,
} from "../types/finance.types";

const initialSummary: FinanceSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  netProfit: 0,
  outstandingAmount: 0,
  outstandingInvoices: 0,
  overdueAmount: 0,
  cashBalance: 0,
  bankBalance: 0,
};

function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

export default function FinancePage() {
  const [summary, setSummary] =
    useState<FinanceSummary>(initialSummary);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    const loadFinance = async () => {
      try {
        setIsLoading(true);

        const data =
          await getFinanceSummary();

        setSummary(data);
      } catch (error) {
        console.error(
          "Error loading finance summary:",
          error,
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadFinance();
  }, []);

  const summaryCards = [
    {
      title: "Total Income",
      value: formatCurrency(
        summary.totalIncome,
      ),
      description: "Selected period",
      icon: ArrowUpCircle,
    },
    {
      title: "Total Expenses",
      value: formatCurrency(
        summary.totalExpenses,
      ),
      description: "Selected period",
      icon: ArrowDownCircle,
    },
    {
      title: "Net Profit",
      value: formatCurrency(
        summary.netProfit,
      ),
      description: "Student fee income - expenses",
      icon: TrendingUp,
    },
    {
      title: "Outstanding",
      value: formatCurrency(
        summary.outstandingAmount,
      ),
      description: `${summary.outstandingInvoices} unpaid invoices`,
      icon: FileText,
    },
    {
      title: "Cash Balance",
      value: formatCurrency(
        summary.cashBalance,
      ),
      description: "Cash payments",
      icon: Wallet,
    },
    {
      title: "Bank Balance",
      value: formatCurrency(
        summary.bankBalance,
      ),
      description: "Bank / online payments",
      icon: Banknote,
    },
  ];

  return (
    <div className="min-w-0 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Finance
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Simple student billing, income tracking, and finance overview.
          </p>
        </div>

        <div className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:w-auto">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Current Period
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            This Month
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          <Loader2
            size={18}
            className="animate-spin"
          />

          Loading financial data...
        </div>
      )}

      {/* Summary Cards */}
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">
                      {card.title}
                    </p>

                    <p className="mt-2 break-words text-2xl font-bold text-slate-900">
                      {card.value}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {card.description}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-xl bg-slate-100 p-3">
                    <Icon
                      size={20}
                      className="text-slate-700"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Income / Expenses */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Income & Expenses
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Financial activity for the current period.
          </p>

          <div className="mt-6 space-y-4">

            <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <ArrowUpCircle
                  size={20}
                  className="shrink-0 text-emerald-600"
                />

                <span className="text-sm font-medium text-slate-700">
                  Income
                </span>
              </div>

              <span className="shrink-0 font-semibold text-slate-900">
                {formatCurrency(
                  summary.totalIncome,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <ArrowDownCircle
                  size={20}
                  className="shrink-0 text-red-600"
                />

                <span className="text-sm font-medium text-slate-700">
                  Expenses
                </span>
              </div>

              <span className="shrink-0 font-semibold text-slate-900">
                {formatCurrency(
                  summary.totalExpenses,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <span className="text-sm font-semibold text-slate-700">
                Net Profit
              </span>

              <span className="shrink-0 text-lg font-bold text-slate-900">
                {formatCurrency(
                  summary.netProfit,
                )}
              </span>
            </div>

          </div>
        </div>

        {/* Receivables */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Receivables
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Money still expected from customers.
          </p>

          <div className="mt-6 space-y-4">

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600">
                Outstanding invoices
              </span>

              <span className="font-semibold text-slate-900">
                {summary.outstandingInvoices}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600">
                Amount due
              </span>

              <span className="font-semibold text-slate-900">
                {formatCurrency(
                  summary.outstandingAmount,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600">
                Overdue
              </span>

              <span className="font-semibold text-red-600">
                {formatCurrency(
                  summary.overdueAmount,
                )}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <Link
                to="/finance/billing"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View billing →
              </Link>
            </div>

          </div>
        </div>

      </section>

      {/* Modules */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Quick Access
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Student billing, income, and finance reports in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {[
            {
              title: "Income",
              description:
                "Track student fee collections and payment records.",
              href: "/finance/income",
            },
            {
              title: "Billing",
              description:
                "Create invoices and record student payments.",
              href: "/finance/billing",
            },
            {
              title: "Expenses",
              description:
                "Record and track operational expenses.",
              href: "/finance/expenses",
            },
            {
              title: "Accounting",
              description:
                "Staff payroll and accounting records.",
              href: "/accounting",
            },
          ].map((module) => (
            <Link
              key={module.title}
              to={module.href}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h3 className="font-semibold text-slate-900">
                {module.title}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {module.description}
              </p>
            </Link>
          ))}

        </div>
      </section>

    </div>
  );
}