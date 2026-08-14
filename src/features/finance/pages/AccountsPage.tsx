import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Loader2, Plus, Trash2 } from "lucide-react";

import AccountForm from "../forms/AccountForm";
import { createAccount, deleteAccount, getAccounts } from "../services/account.service";
import type { Account, AccountFormData } from "../types/account.types";

export default function AccountsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setAccounts(await getAccounts());
    } catch (err) {
      console.error("Failed to load accounts:", err);
      setError("Unable to load chart of accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const assetTotal = useMemo(
    () => accounts.filter((item) => item.accountType === "Asset").reduce((sum, item) => sum + Number(item.currentBalance ?? 0), 0),
    [accounts],
  );

  async function handleSubmit(data: AccountFormData) {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      await createAccount(data);
      setShowForm(false);
      setSuccess("Account created successfully.");
      await loadData();
    } catch (err) {
      console.error("Failed to create account:", err);
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id?: string) {
    if (!id) return;

    try {
      const confirmed = window.confirm("Delete this account?");
      if (!confirmed) return;

      await deleteAccount(id);
      setSuccess("Account deleted.");
      await loadData();
    } catch (err) {
      console.error("Failed to delete account:", err);
      setError(err instanceof Error ? err.message : "Unable to delete account.");
    }
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/finance")}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to Finance
            </button>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <BookOpen size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Chart of Accounts</h1>
                <p className="mt-1 text-sm text-slate-500 sm:text-base">
                  Manage income, expense, asset, liability, and equity accounts.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowForm((current) => !current)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
          >
            <Plus size={18} />
            {showForm ? "Close Form" : "Add Account"}
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Asset Total</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">Rs. {assetTotal.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Accounts</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{accounts.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{accounts.filter((item) => item.status === "Active").length}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>
        )}

        {showForm && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Add Account</h2>
            <AccountForm onSubmit={handleSubmit} isLoading={submitting} />
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={18} />
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <BookOpen size={32} className="mb-4 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">No accounts yet</h2>
              <p className="mt-2 text-sm text-slate-500">Create your chart of accounts to organize the finance ledger.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-3 font-medium">Code</th>
                    <th className="px-3 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Balance</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-t border-slate-200">
                      <td className="px-3 py-3 text-slate-700">{account.accountCode}</td>
                      <td className="px-3 py-3 text-slate-700">{account.accountName}</td>
                      <td className="px-3 py-3 text-slate-700">{account.accountType}</td>
                      <td className="px-3 py-3 text-slate-700">Rs. {Number(account.currentBalance ?? 0).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${account.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(account.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
