import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Users, Wallet } from "lucide-react";

import { getStaff } from "@/features/staff/services/staff.service";
import type { Staff } from "@/features/staff/types/staff.types";

export default function PayrollPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const staffList = await getStaff();
        setStaff(staffList.filter((member) => member.status !== "Inactive"));
      } catch (error) {
        console.error("Failed to load staff data:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate("/finance")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Finance
          </button>

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Payroll</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Manage staff salary calculations, deductions, and payslips.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Users size={22} className="mb-3 text-blue-600" />
            <p className="text-sm text-slate-500">Active Staff</p>
            <p className="mt-2 text-2xl font-bold">{staff.length}</p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-2">
            <Wallet size={22} className="mb-3 text-green-600" />
            <p className="text-sm text-slate-500">Payment Management</p>
            <p className="mt-2 text-sm text-slate-600">Grant and track staff payments through the Payment module</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={18} />
              Loading staff...
            </div>
          ) : staff.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
              <Users size={32} className="mb-4 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">No staff available</h2>
              <p className="mt-2 text-sm text-slate-500">Add staff members to manage their payments.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-3 font-medium">Staff Name</th>
                    <th className="px-3 py-3 font-medium">Email</th>
                    <th className="px-3 py-3 font-medium">Employment Type</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id} className="border-t border-slate-200">
                      <td className="px-3 py-3 text-slate-700">
                        <div>
                          <p className="font-medium text-slate-900">{member.fullName}</p>
                          <p className="text-xs text-slate-500">{member.staffCode}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{member.email ?? "—"}</td>
                      <td className="px-3 py-3 text-slate-700">{member.employmentType}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            member.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : member.status === "Inactive"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => navigate(`/staff/payment/${member.id}`)}
                          className="text-blue-600 hover:underline"
                        >
                          Grant Payment
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