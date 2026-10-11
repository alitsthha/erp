import PaginatedList from "@/components/common/PaginatedList";
import { Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import type { Role } from "../types/role.types";

type Props = {
  roles: Role[];
  onDelete: (id: string) => void;
};

export default function RoleTable({
  roles,
  onDelete,
}: Props) {
  return (
    <div className="ui-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="ui-table divide-y divide-slate-200">
          <thead className="ui-table-head">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Role
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Description
              </th>

              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Order
              </th>

              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Color
              </th>

              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Status
              </th>

              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {roles.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-slate-500"
                >
                  No roles found.
                </td>
              </tr>
            ) : (
              <PaginatedList showSort={false} items={roles} table>{(role) => (
                <tr
                  key={role.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {role.name}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {role.description}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {role.displayOrder}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <div
                        className="h-6 w-6 rounded-full border"
                        style={{
                          backgroundColor: role.color,
                        }}
                      />
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        role.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {role.status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/staff/roles/edit/${role.id}`}
                        className="rounded-lg p-2 text-brand-600 hover:bg-brand-50"
                      >
                        <Pencil size={18} />
                      </Link>

                      <button
                        onClick={() => onDelete(role.id)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}</PaginatedList>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}