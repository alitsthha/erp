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
          <h1 className="text-3xl font-bold text-gray-900">
            Roles
          </h1>

          <p className="mt-1 text-gray-500">
            Manage staff roles and permissions.
          </p>
        </div>

        <Link
          to="/staff/roles/add"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Role
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Roles
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {roles.length}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Active Roles
          </p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {activeRoles}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Inactive Roles
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-700">
            {roles.length - activeRoles}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles..."
            className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-gray-500 shadow-sm">
          Loading roles...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-gray-500 shadow-sm">
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