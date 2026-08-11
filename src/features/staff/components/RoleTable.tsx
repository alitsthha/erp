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
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Role
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Description
              </th>

              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                Order
              </th>

              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                Color
              </th>

              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                Status
              </th>

              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {roles.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-gray-500"
                >
                  No roles found.
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr
                  key={role.id}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {role.name}
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    {role.description}
                  </td>

                  <td className="px-6 py-4 text-center">
                    {role.displayOrder}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <div
                        className="h-6 w-6 rounded-full border"
                        style={{
                          backgroundColor: role.color,
                        }}
                      />
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
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

                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/staff/roles/edit/${role.id}`}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}