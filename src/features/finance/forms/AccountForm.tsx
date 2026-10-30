import SafeForm from "@/components/forms/SafeForm";
import SearchableSelect from "@/components/forms/SearchableSelect";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  accountSchema,
  type AccountFormData,
} from "../schemas/account.schema";

import type { Account } from "../types/account.types";

type AccountFormProps = {
  initialData?: Partial<Account>;
  onSubmit: (data: AccountFormData) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
};

const inputClass =
  "ui-field w-full border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50";

const selectClass =
  "ui-field w-full border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50";

const textareaClass =
  "min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50";

const errorClass =
  "mt-1 text-xs text-red-500";

export default function AccountForm({
  initialData,
  onSubmit,
  submitLabel = "Save Account",
  isLoading = false,
}: AccountFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty,
      errors,
      isSubmitting,
    },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema) as any,

    defaultValues: {
      accountCode: "",
      accountName: "",
      accountType: "Asset",

      parentAccountId: "",
      parentAccountName: "",

      openingBalance: 0,
      currentBalance: 0,

      isCashAccount: false,
      isBankAccount: false,

      status: "Active",

      description: "",
    },
  });

  useEffect(() => {
    if (!initialData) {
      return;
    }

    reset({
      accountCode: initialData.accountCode ?? "",
      accountName: initialData.accountName ?? "",
      accountType: initialData.accountType ?? "Asset",

      parentAccountId: initialData.parentAccountId ?? "",
      parentAccountName: initialData.parentAccountName ?? "",

      openingBalance: initialData.openingBalance ?? 0,
      currentBalance: initialData.currentBalance ?? 0,

      isCashAccount: initialData.isCashAccount ?? false,
      isBankAccount: initialData.isBankAccount ?? false,

      status: initialData.status ?? "Active",

      description: initialData.description ?? "",
    });
  }, [initialData, reset]);

  const accountType = watch("accountType");

  const submitting = isSubmitting || isLoading;

  return (
    <SafeForm dirty={isDirty}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      {/* ------------------------------------------------ */}
      {/* ACCOUNT INFORMATION */}
      {/* ------------------------------------------------ */}

      <section className="ui-surface">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h2 className="ui-section-title">
            Account Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Create an account for your organization's chart of accounts.
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Account Code */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Account Code
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                type="text"
                placeholder="e.g. 1000"
                {...register("accountCode")}
                disabled={submitting}
                className={inputClass}
              />

              {errors.accountCode && (
                <p className={errorClass}>
                  {errors.accountCode.message}
                </p>
              )}

              <p className="mt-1 text-xs text-slate-400">
                Use a unique code such as 1000, 4000 or 5000.
              </p>
            </div>

            {/* Account Name */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Account Name
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                type="text"
                placeholder="e.g. Cash"
                {...register("accountName")}
                disabled={submitting}
                className={inputClass}
              />

              {errors.accountName && (
                <p className={errorClass}>
                  {errors.accountName.message}
                </p>
              )}
            </div>

            {/* Account Type */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Account Type
                <span className="ml-1 text-red-500">*</span>
              </label>

              <SearchableSelect value={watch("accountType")}
                {...register("accountType")}
                disabled={submitting}
                className={selectClass}
              >
                <option value="Asset">
                  Asset
                </option>

                <option value="Liability">
                  Liability
                </option>

                <option value="Equity">
                  Equity
                </option>

                <option value="Income">
                  Income
                </option>

                <option value="Expense">
                  Expense
                </option>
              </SearchableSelect>

              {errors.accountType && (
                <p className={errorClass}>
                  {errors.accountType.message}
                </p>
              )}

              <p className="mt-1 text-xs text-slate-400">
                {accountType === "Asset" &&
                  "Money or resources owned by the organization."}

                {accountType === "Liability" &&
                  "Money or obligations owed by the organization."}

                {accountType === "Equity" &&
                  "Owner or organization's accumulated equity."}

                {accountType === "Income" &&
                  "Money earned from students, camps or other sources."}

                {accountType === "Expense" &&
                  "Money spent to operate the organization."}
              </p>
            </div>

            {/* Parent Account */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Parent Account
              </label>

              <input
                type="text"
                placeholder="Optional parent account"
                {...register("parentAccountName")}
                disabled={submitting}
                className={inputClass}
              />

              <p className="mt-1 text-xs text-slate-400">
                Example: Rent can belong under Operating Expenses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ */}
      {/* BALANCE INFORMATION */}
      {/* ------------------------------------------------ */}

      <section className="ui-surface">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h2 className="ui-section-title">
            Balance Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Set the opening balance when creating an existing account.
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Opening Balance */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Opening Balance
              </label>

              <div className="relative">
                <span className="ui-field-icon text-sm font-medium text-slate-500">
                  Rs.
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("openingBalance", {
                    valueAsNumber: true,
                  })}
                  disabled={submitting}
                  className={`${inputClass} ui-field-prefix`}
                />
              </div>

              {errors.openingBalance && (
                <p className={errorClass}>
                  {errors.openingBalance.message}
                </p>
              )}
            </div>

            {/* Current Balance */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Current Balance
              </label>

              <div className="relative">
                <span className="ui-field-icon text-sm font-medium text-slate-500">
                  Rs.
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("currentBalance", {
                    valueAsNumber: true,
                  })}
                  disabled
                  className={`${inputClass} bg-slate-50 ui-field-prefix`}
                />
              </div>

              <p className="mt-1 text-xs text-slate-400">
                Current balance will be calculated automatically from
                transactions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ */}
      {/* CASH / BANK SETTINGS */}
      {/* ------------------------------------------------ */}

      <section className="ui-surface">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h2 className="ui-section-title">
            Account Settings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure how this account is used in your finance system.
          </p>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {/* Cash Account */}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
            <input
              type="checkbox"
              {...register("isCashAccount")}
              disabled={submitting}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />

            <span>
              <span className="block text-sm font-medium text-slate-800">
                Cash Account
              </span>

              <span className="mt-1 block text-xs text-slate-500">
                Use this account for physical cash transactions.
              </span>
            </span>
          </label>

          {/* Bank Account */}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
            <input
              type="checkbox"
              {...register("isBankAccount")}
              disabled={submitting}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />

            <span>
              <span className="block text-sm font-medium text-slate-800">
                Bank Account
              </span>

              <span className="mt-1 block text-xs text-slate-500">
                Use this account for bank transactions.
              </span>
            </span>
          </label>

          {/* Status */}

          <div className="pt-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>

            <SearchableSelect value={watch("status")}
              {...register("status")}
              disabled={submitting}
              className={selectClass}
            >
              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </SearchableSelect>

            {errors.status && (
              <p className={errorClass}>
                {errors.status.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ */}
      {/* DESCRIPTION */}
      {/* ------------------------------------------------ */}

      <section className="ui-surface">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h2 className="ui-section-title">
            Additional Information
          </h2>
        </div>

        <div className="p-5 sm:p-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Description
          </label>

          <textarea
            rows={4}
            placeholder="Add an internal description for this account..."
            {...register("description")}
            disabled={submitting}
            className={textareaClass}
          />

          {errors.description && (
            <p className={errorClass}>
              {errors.description.message}
            </p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------ */}
      {/* ACTIONS */}
      {/* ------------------------------------------------ */}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="ui-button inline-flex w-full items-center justify-center bg-brand-600 py-3 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting
            ? "Saving..."
            : submitLabel}
        </button>
      </div>
    </SafeForm>
  );
}