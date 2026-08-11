import {
  Edit,
  Trash2,
  Wallet,
  Building2,
  Landmark,
  ArrowUpCircle,
  ArrowDownCircle,
  MoreHorizontal,
} from "lucide-react";

import type { Account } from "@/features/finance/types/account.types";
import { formatCurrency } from "@/utils/currency";

interface AccountTableProps {
  accounts: Account[];
  onEdit?: (account: Account) => void;
  onDelete?: (accountId: string) => void;
  isLoading?: boolean;
}

const accountTypeStyles: Record<
  Account["accountType"],
  {
    label: string;
    className: string;
  }
> = {
  Asset: {
    label: "Asset",
    className: "bg-blue-50 text-blue-700 ring-blue-600/10",
  },
  Liability: {
    label: "Liability",
    className: "bg-orange-50 text-orange-700 ring-orange-600/10",
  },
  Equity: {
    label: "Equity",
    className: "bg-purple-50 text-purple-700 ring-purple-600/10",
  },
  Income: {
    label: "Income",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  },
  Expense: {
    label: "Expense",
    className: "bg-red-50 text-red-700 ring-red-600/10",
  },
};

function getAccountIcon(accountType: Account["accountType"]) {
  switch (accountType) {
    case "Asset":
      return <Wallet size={18} />;

    case "Liability":
      return <Landmark size={18} />;

    case "Equity":
      return <Building2 size={18} />;

    case "Income":
      return <ArrowUpCircle size={18} />;

    case "Expense":
      return <ArrowDownCircle size={18} />;

    default:
      return <Wallet size={18} />;
  }
}

export default function AccountTable({
  accounts,
  onEdit,
  onDelete,
  isLoading = false,
}: AccountTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-16 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Wallet size={26} />
        </div>

        <h3 className="mt-4 text-base font-semibold text-slate-900">
          No accounts found
        </h3>

        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Create your first account to start managing your organization&apos;s
          financial balances.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* =========================================================
          DESKTOP / TABLET
      ========================================================== */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="min-w-[950px] w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Account
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Type
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Opening Balance
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current Balance
                </th>

                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {accounts.map((account) => {
                const typeStyle = accountTypeStyles[account.accountType];

                return (
                  <tr
                    key={account.id ?? account.accountCode}
                    className="transition hover:bg-slate-50/70"
                  >
                    {/* Account */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          {getAccountIcon(account.accountType)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {account.accountName}
                          </p>

                          <p className="mt-0.5 font-mono text-xs text-slate-500">
                            {account.accountCode}
                          </p>

                          {account.description && (
                            <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                              {account.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                          typeStyle?.className ??
                          "bg-slate-50 text-slate-700 ring-slate-600/10"
                        }`}
                      >
                        {typeStyle?.label ?? account.accountType}
                      </span>
                    </td>

                    {/* Opening Balance */}
                    <td className="px-5 py-4 text-right">
                      <span className="font-medium text-slate-700">
                        {formatCurrency(account.openingBalance ?? 0)}
                      </span>
                    </td>

                    {/* Current Balance */}
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`font-semibold ${
                          (account.currentBalance ?? 0) > 0
                            ? "text-emerald-600"
                            : (account.currentBalance ?? 0) < 0
                              ? "text-red-600"
                              : "text-slate-700"
                        }`}
                      >
                        {formatCurrency(account.currentBalance ?? 0)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          account.status === "Active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            account.status === "Active"
                              ? "bg-emerald-500"
                              : "bg-slate-400"
                          }`}
                        />

                        {account.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(account)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <Edit size={15} />
                            Edit
                          </button>
                        )}

                        {onDelete && account.id && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete account "${account.accountName}"?`
                                )
                              ) {
                                onDelete(account.id!);
                              }
                            }}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
                            title="Delete account"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          MOBILE
      ========================================================== */}
      <div className="space-y-3 md:hidden">
        {accounts.map((account) => {
          const typeStyle = accountTypeStyles[account.accountType];

          return (
            <div
              key={account.id ?? account.accountCode}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    {getAccountIcon(account.accountType)}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">
                      {account.accountName}
                    </h3>

                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {account.accountCode}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                    typeStyle?.className ??
                    "bg-slate-50 text-slate-700 ring-slate-600/10"
                  }`}
                >
                  {typeStyle?.label ?? account.accountType}
                </span>
              </div>

              {/* Description */}
              {account.description && (
                <p className="mt-3 text-sm leading-5 text-slate-500">
                  {account.description}
                </p>
              )}

              {/* Balance */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">
                    Opening Balance
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatCurrency(account.openingBalance ?? 0)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">
                    Current Balance
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      (account.currentBalance ?? 0) > 0
                        ? "text-emerald-600"
                        : (account.currentBalance ?? 0) < 0
                          ? "text-red-600"
                          : "text-slate-700"
                    }`}
                  >
                    {formatCurrency(account.currentBalance ?? 0)}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    account.status === "Active"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      account.status === "Active"
                        ? "bg-emerald-500"
                        : "bg-slate-400"
                    }`}
                  />

                  {account.status}
                </span>

                <div className="flex items-center gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(account)}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Edit size={15} />
                      <span>Edit</span>
                    </button>
                  )}

                  {onDelete && account.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete account "${account.accountName}"?`
                          )
                        ) {
                          onDelete(account.id!);
                        }
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      title="Delete account"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  {!onEdit && !onDelete && (
                    <MoreHorizontal size={18} className="text-slate-400" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}