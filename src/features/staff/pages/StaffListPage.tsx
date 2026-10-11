import ListSortControl from "@/components/common/ListSortControl";
import PaginatedList from "@/components/common/PaginatedList";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RotateCw, Search, Users, Briefcase, Mail, Phone } from "lucide-react";

import { convertADToBS, formatBSDate } from "@/utils/nepali-date";
import { useStaff } from "../hooks/useStaff";
import StaffStatusBadge from "../components/StaffStatusBadge";
import type { Staff } from "../types/staff.types";

function normalizeToBsDate(value?: string): string {
  if (!value) return "";

  const year = Number(value.slice(0, 4));
  if (Number.isFinite(year) && year >= 2070 && year <= 2100) {
    return value;
  }

  return convertADToBS(value);
}

export default function StaffListPage() {
  const navigate = useNavigate();
  const { staffs, loading, removeStaff } = useStaff();
  const [search, setSearch] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("all");

  // Filter staff based on search and employment type
  const filteredStaffs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return staffs.filter((staff) => {
      const matchesSearch =
        keyword === "" ||
        staff.fullName.toLowerCase().includes(keyword) ||
        staff.email?.toLowerCase().includes(keyword) ||
        staff.staffCode?.toLowerCase().includes(keyword) ||
        staff.phone.toLowerCase().includes(keyword);

      const matchesFilter =
        employmentFilter === "all" ||
        staff.employmentType.toLowerCase() === employmentFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [staffs, search, employmentFilter]);

  // Delete staff member
  async function handleDelete(staff: Staff) {
    if (!staff.id) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${staff.fullName}?`);
    if (!confirmed) return;

    try {
      await removeStaff(staff.id);
    } catch (error) {
      console.error(error);
      window.alert("Failed to delete staff member.");
    }
  }

  // Clear filters
  function clearFilters() {
    setSearch("");
    setEmploymentFilter("all");
  }

  return (
    <div className="min-h-full space-y-6">
      <div className="ui-page mx-auto w-full">
        {/* ===== PAGE HEADER ===== */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="ui-page-title">
              Staff Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage academy staff members, roles, and employment details.
            </p>
          </div>

          <button
            onClick={() => navigate("/staff/add")}
            className="ui-button inline-flex w-full items-center justify-center gap-2 bg-brand-600 py-2.5 text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus size={18} />
            Add Staff
          </button>
        </div>

        {/* ===== STAFF DIRECTORY ===== */}
        <div className="ui-surface overflow-hidden">
          {/* Section Header */}
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="ui-section-title text-sm">Staff Directory</h2>
                <p className="mt-0.5 text-xs text-slate-500">Search and filter staff members.</p>
              </div>
            </div>
          </div>

          {/* ===== SEARCH & FILTERS ===== */}
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
                  placeholder="Search by name, email, code or phone..."
                  className="ui-field w-full pl-10 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <ListSortControl />

              {/* Employment Type Filter */}
              <div className="w-full lg:w-48">
                <select
                  value={employmentFilter}
                  onChange={(e) => setEmploymentFilter(e.target.value)}
                  className="ui-field w-full px-4 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="all">All Employment Types</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Temporary">Temporary</option>
                  <option value="Volunteer">Volunteer</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(search || employmentFilter !== "all") && (
                <button
                  onClick={clearFilters}
                  className="ui-button inline-flex items-center justify-center gap-2 border border-slate-300 py-2.5 text-slate-700 transition hover:bg-slate-50"
                >
                  <RotateCw size={16} />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ===== STAFF TABLE ===== */}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-brand-600"></div>
                <p className="mt-2 text-sm text-slate-500">Loading staff...</p>
              </div>
            </div>
          ) : filteredStaffs.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <Briefcase size={48} className="mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900">No staff found</h3>
              <p className="mt-2 text-sm text-slate-500">
                {search || employmentFilter !== "all"
                  ? "Try adjusting your filters or search terms."
                  : "Add your first staff member to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ui-table text-slate-700">
                <thead className="ui-table-head border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Name & Code</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Employment</th>
                    <th className="px-4 py-3">Joining Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {<PaginatedList showSort={false} items={filteredStaffs} table>{(staff) => (
                    <tr key={staff.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{staff.fullName}</p>
                          <p className="text-xs text-slate-500">{staff.staffCode || "—"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {staff.email && (
                            <div className="flex items-center gap-2 text-slate-700">
                              <Mail size={14} className="text-slate-400" />
                              <span className="text-xs">{staff.email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-slate-700">
                            <Phone size={14} className="text-slate-400" />
                            <span className="text-xs">{staff.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-700">{staff.employmentType}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-700">{formatBSDate(normalizeToBsDate(staff.joiningDate), "full")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StaffStatusBadge status={staff.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/staff/edit/${staff.id}`)}
                            className="rounded px-3 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(staff)}
                            className="rounded px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}</PaginatedList>}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {filteredStaffs.length > 0 && (
            <div className="border-t border-slate-200 px-5 py-4">
              <p className="text-xs text-slate-500">
                Showing {filteredStaffs.length} of {staffs.length} staff members
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
