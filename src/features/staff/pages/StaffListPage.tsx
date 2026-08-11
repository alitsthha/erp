import { Link } from "react-router-dom";

import StaffTable from "../components/StaffTable";
import { useStaff } from "../hooks/useStaff";

export default function StaffListPage() {
  const {
    staffs,
    loading,
    removeStaff,
  } = useStaff();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Staff Management
          </h1>

          <p className="text-gray-500">
            Manage academy staff
          </p>
        </div>

        <Link
          to="/staff/add"
          className="rounded-lg bg-blue-600 px-5 py-3 text-white"
        >
          + Add Staff
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-10 text-center shadow">
          Loading...
        </div>
      ) : (
        <StaffTable
          staffs={staffs}
          onDelete={removeStaff}
        />
      )}
    </div>
  );
}