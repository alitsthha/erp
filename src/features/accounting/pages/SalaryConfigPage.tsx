import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  Edit2,
  Loader2,
  Plus,
  RotateCw,
  Search,
  Trash2,
} from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
        config.role.toLowerCase().includes(keyword) ||
        config.salaryType.toLowerCase().includes(keyword);

      const matchesFilter =
        statusFilter === "all" || config.status === statusFilter;

      return matchesSearch && matchesFilter;
    });
  }, [configs, search, statusFilter]);

  // Delete config
  async function handleDelete(config: SalaryConfig) {
    if (!config.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the salary config for ${config.role}?`
    );
    if (!confirmed) return;

    try {
      await deleteSalaryConfig(config.id);
      setConfigs((prev) => prev.filter((c) => c.id !== config.id));
    } catch (error) {
      console.error("Failed to delete config:", error);
      alert("Failed to delete salary configuration.");
    }
  }

  // Clear filters
  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <div className="min-h-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* PAGE HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Salary Configuration
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Define salary structures, allowances, deductions, and benefits for different roles.
            </p>
          </div>

          <button
            onClick={() => navigate("/accounting/salary-config/add")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus size={18} />
            Add Configuration
          </button>
        </div>

        {/* SALARY CONFIG DIRECTORY */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Section Header */}
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Briefcase size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">Salary Structures</h2>
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

          {/* SEARCH & FILTERS */}
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-3 lg:flex-row">
              {/* Search */}
              <div className="relative min-w-0 flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by role or salary type..."
                  className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Status Filter */}
              <div className="w-full lg:w-40">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(search || statusFilter !== "all") && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <RotateCw size={16} />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* LOADING STATE */}
          {loading && (
            <div className="flex min-h-[200px] items-center justify-center p-6 text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={18} />
              Loading salary configurations...
            </div>
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
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Salary Type</th>
                    <th className="px-5 py-3 font-medium text-right">Basic Salary</th>
                    <th className="px-5 py-3 font-medium text-right">Allowance</th>
                    <th className="px-5 py-3 font-medium text-right">Deduction</th>
                    <th className="px-5 py-3 font-medium text-center">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredConfigs.map((config) => (
                    <tr key={config.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {config.role}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {config.salaryType}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(config.basicSalary)}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {formatCurrency(config.allowance)}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {formatCurrency(config.deduction)}
                      </td>
                      <td className="px-5 py-3 text-center">
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
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              navigate(
                                `/accounting/salary-config/edit/${config.id}`
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
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
