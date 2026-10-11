import ListSortControl from "@/components/common/ListSortControl";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";

import RoleTable from "../components/RoleTable";
import { deleteRole, getRoles } from "../services/role.service";

import type { Role } from "../types/role.types";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    try {
      const data = await getRoles();
      setRoles(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this role?")) return;

    await deleteRole(id);

    setRoles((prev) => prev.filter((r) => r.id !== id));
  }

  const filtered = useMemo(() => {
    return roles.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [roles, search]);

  const activeRoles = roles.filter(
    (r) => r.status === "Active"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ui-page-title">
            Roles
          </h1>

          <p className="mt-1 text-slate-500">
            Manage staff roles and permissions.
          </p>
        </div>

        <Link
          to="/staff/roles/add"
          className="ui-button inline-flex items-center gap-2 bg-brand-600 py-3 text-white hover:bg-brand-700"
        >
          <Plus size={18} />
          Add Role
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:p-5 p-4 ui-surface">
          <p className="text-sm text-slate-500">
            Total Roles
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {roles.length}
          </p>
        </div>

        <div className="sm:p-5 p-4 ui-surface">
          <p className="text-sm text-slate-500">
            Active Roles
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {activeRoles}
          </p>
        </div>

        <div className="sm:p-5 p-4 ui-surface">
          <p className="text-sm text-slate-500">
            Inactive Roles
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-700">
            {roles.length - activeRoles}
          </p>
        </div>
      </div>

      <div className="ui-surface flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles..."
            className="ui-field w-full pl-10 pr-4 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <ListSortControl />
      </div>

      {loading ? (
        <div className="ui-surface p-10 text-center text-slate-500">
          Loading roles...
        </div>
      ) : filtered.length === 0 ? (
        <div className="ui-surface p-10 text-center text-slate-500">
          No roles found.
        </div>
      ) : (
        <RoleTable
          roles={filtered}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}