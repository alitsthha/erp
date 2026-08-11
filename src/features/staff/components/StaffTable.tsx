import { Link } from "react-router-dom";
import { Eye, Pencil, Trash2 } from "lucide-react";

import type { Staff } from "../types/staff.types";
import StaffStatusBadge from "./StaffStatusBadge";

type Props = {
  staffs: Staff[];
  onDelete: (id: string) => void;
};

export default function StaffTable({
  staffs,
  onDelete,
}: Props) {
  if (staffs.length === 0) {
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow">
        No staff found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-3 text-left">Code</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Department</th>
            <th className="px-4 py-3 text-left">Role</th>
            <th className="px-4 py-3 text-left">Salary</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {staffs.map((staff) => (
            <tr
              key={staff.id}
              className="border-t hover:bg-gray-50"
            >
              <td className="px-4 py-4">
                {staff.staffCode}
              </td>

              <td className="px-4 py-4 font-medium">
                {staff.fullName}
              </td>

              <td className="px-4 py-4">
                {staff.department}
              </td>

              <td className="px-4 py-4">
                {staff.role}
              </td>

              <td className="px-4 py-4">
                Rs. {staff.basicSalary}
              </td>

              <td className="px-4 py-4">
                <StaffStatusBadge status={staff.status} />
              </td>

              <td className="px-4 py-4">
                <div className="flex justify-center gap-3">
                  <Link to={`/staff/${staff.id}`}>
                    <Eye
                      size={18}
                      className="text-blue-600 hover:text-blue-800"
                    />
                  </Link>

                  <Link to={`/staff/edit/${staff.id}`}>
                    <Pencil
                      size={18}
                      className="text-green-600 hover:text-green-800"
                    />
                  </Link>

                  <button
                    onClick={() => onDelete(staff.id)}
                  >
                    <Trash2
                      size={18}
                      className="text-red-600 hover:text-red-800"
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}