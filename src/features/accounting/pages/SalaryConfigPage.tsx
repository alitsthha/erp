import { useSessionState } from "@/hooks/useSessionState";
import SearchableSelect from "@/components/forms/SearchableSelect";
import PaginatedList from "@/components/common/PaginatedList";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  Edit2,
  Plus,
  Trash2,
} from "lucide-react";

import ConfirmDialog from "@/components/common/ConfirmDialog";
import ListSkeleton from "@/components/common/ListSkeleton";
import ListToolbar from "@/components/common/ListToolbar";

import {
  getSalaryConfigs,
  deleteSalaryConfig,
} from "@/features/staff/services/salaryConfig.service";
import type { SalaryConfig } from "@/features/staff/types/salaryConfig.types";

function formatCurrency(value: number): string {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

export default function SalaryConfigPage() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useSessionState("accounting:SalaryConfigPage:search", "");
  const [statusFilter, setStatusFilter] = useSessionState("accounting:SalaryConfigPage:statusFilter", "all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<SalaryConfig | "bulk" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load salary configs
  useEffect(() => {
    async function loadConfigs() {
      try {
        setLoading(true);
        setError(null);
        const data = await getSalaryConfigs();
        setConfigs(data);
      } catch (err) {
        console.error("Failed to load salary configs:", err);
        setError("Failed to load salary configurations.");
      } finally {
        setLoading(false);
      }
    }

    void loadConfigs();
  }, []);

  // Filter configs
  const filteredConfigs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return configs.filter((config) => {
      const matchesSearch =
        keyword === "" ||
        `${config.staffName} ${config.role}`.toLowerCase().includes(keyword) ||
        config.salaryType.toLowerCase().includes(keyword);

      const matchesFilter =
        statusFilter === "all" || config.status === statusFilter;

      return matchesSearch && matchesFilter;
    });
  }, [configs, search, statusFilter]);

  // Delete config
  async function handleDelete(config: SalaryConfig) {
    if (!config.id) return;
    setDeleteTarget(config);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const ids = deleteTarget === "bulk"
        ? selectedIds
        : deleteTarget.id
          ? [deleteTarget.id]
          : [];
      await Promise.all(ids.map((id) => deleteSalaryConfig(id)));
      setConfigs((prev) => prev.filter((config) => !ids.includes(config.id)));
      setSelectedIds([]);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete config:", error);
      setError("Failed to delete salary configuration.");
    } finally {
      setIsDeleting(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const allVisibleSelected = filteredConfigs.length > 0 && filteredConfigs.every((config) => config.id && selectedIds.includes(config.id));

  // Clear filters
  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <div className="min-h-full space-y-6">
      <div className="ui-page mx-auto w-full">
        {/* PAGE HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="ui-page-title">
              Salary Configuration
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Define salary structures, allowances, deductions, and benefits for different roles.
            </p>
          </div>

          <button
            onClick={() => navigate("/accounting/salary-config/add")}
            className="ui-button inline-flex w-full items-center justify-center gap-2 bg-brand-600 py-2.5 text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus size={18} />
            Add Configuration
          </button>
        </div>

        {/* SALARY CONFIG DIRECTORY */}
        <div className="ui-surface overflow-hidden">
          {/* Section Header */}
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Briefcase size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="ui-section-title text-sm">Salary Structures</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {filteredConfigs.length} of {configs.length} configurations
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="border-b border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by role or salary type..."
            resultCount={filteredConfigs.length}
            onClear={clearFilters}
            filter={<SearchableSelect aria-label="Filter salary configurations by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ui-field w-full px-3 text-slate-900 outline-none focus:border-brand-600"><option value="all">All statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option></SearchableSelect>}
          />

          {selectedIds.length > 0 && (
            <div className="flex flex-col gap-2 border-b border-brand-100 bg-brand-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span className="font-medium text-brand-900">{selectedIds.length} configurations selected</span>
              <button type="button" onClick={() => setDeleteTarget("bulk")} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"><Trash2 size={14} /> Delete selected</button>
            </div>
          )}

          {/* LOADING STATE */}
          {loading && (
            <ListSkeleton rows={6} columns={6} />
          )}

          {/* EMPTY STATE */}
          {!loading && filteredConfigs.length === 0 && (
            <div className="flex min-h-[200px] flex-col items-center justify-center p-6 text-center">
              <Briefcase size={32} className="mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900">
                {configs.length === 0
                  ? "No salary configurations yet"
                  : "No results found"}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {configs.length === 0
                  ? "Add your first salary configuration to get started."
                  : "Try adjusting your search or filter criteria."}
              </p>
            </div>
          )}

          {/* TABLE */}
          {!loading && filteredConfigs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="ui-table divide-y divide-slate-200">
                <thead className="ui-table-head">
                  <tr>
                    <th className="w-12 px-4 py-3"><input type="checkbox" aria-label="Select all filtered configurations on all pages" checked={allVisibleSelected} onChange={() => setSelectedIds(allVisibleSelected ? [] : filteredConfigs.flatMap((config) => config.id ? [config.id] : []))} /></th>
                    <th className="px-4 py-3 font-medium">Staff Member</th>
                    <th className="px-4 py-3 font-medium">Salary Type</th>
                    <th className="px-4 py-3 font-medium text-right">Basic Salary</th>
                    <th className="px-4 py-3 font-medium text-right">Allowance</th>
                    <th className="px-4 py-3 font-medium text-right">Deduction</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {<PaginatedList showSort={false} items={filteredConfigs} table>{(config) => (
                    <tr key={config.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${config.role}`} checked={Boolean(config.id && selectedIds.includes(config.id))} onChange={() => config.id && toggleSelected(config.id)} /></td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {config.staffName || config.role}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                          {config.salaryType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(config.basicSalary)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatCurrency(config.allowance)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatCurrency(config.deduction)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            config.status === "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {config.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              navigate(
                                `/accounting/salary-config/edit/${config.id}`
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg p-2 text-slate-600 transition hover:bg-brand-50 hover:text-brand-600"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(config)}
                            className="inline-flex items-center gap-1.5 rounded-lg p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}</PaginatedList>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget === "bulk" ? "Delete selected configurations?" : "Delete salary configuration?"}
        description={deleteTarget === "bulk" ? `This will permanently remove ${selectedIds.length} selected salary configurations.` : `This will permanently remove the salary configuration for ${(deleteTarget as SalaryConfig | null)?.role ?? "this role"}.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
