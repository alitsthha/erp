import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Users, Wallet } from "lucide-react";

import { getStaff } from "@/features/staff/services/staff.service";
import { getSalaryConfigs } from "@/features/staff/services/salaryConfig.service";
import type { Staff } from "@/features/staff/types/staff.types";
import type { SalaryConfig } from "@/features/staff/types/salaryConfig.types";

export default function PayrollPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<SalaryConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [staffList, configs] = await Promise.all([getStaff(), getSalaryConfigs()]);
        setStaff(staffList.filter((member) => member.status !== "Inactive"));
        setSalaryConfigs(configs.filter((config) => config.status === "Active"));
      } catch (error) {
        console.error("Failed to load payroll data:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const payrollRows = useMemo(
    () =>
      staff.map((member) => {
        const config = salaryConfigs.find((item) => item.role === member.role) ?? null;
        const basic = Number(member.basicSalary ?? config?.basicSalary ?? 0);
        const allowance = Number(member.allowance ?? config?.allowance ?? 0);
        const overtime = Number(member.overtimeRate ?? config?.overtimeRate ?? 0);
        const bonus = Number(config?.bonus ?? 0);
        const deduction = Number(config?.deduction ?? 0);
        const tax = Number(config?.tax ?? 0);
        const gross = basic + allowance + overtime + bonus;
        const net = gross - deduction - tax;

        return {
          ...member,
          gross,
          deduction,
          tax,
          net,
        };
      }),
    [salaryConfigs, staff],
  );

  const grossTotal = payrollRows.reduce((sum, row) => sum + row.gross, 0);
  const netTotal = payrollRows.reduce((sum, row) => sum + row.net, 0);

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
            <p className="text-sm text-slate-500">Staff</p>
            <p className="mt-2 text-2xl font-bold">{staff.length}</p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Wallet size={22} className="mb-3 text-green-600" />
            <p className="text-sm text-slate-500">Gross Salary</p>
            <p className="mt-2 text-2xl font-bold">Rs. {grossTotal.toLocaleString("en-IN")}</p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <Wallet size={22} className="mb-3 text-purple-600" />
            <p className="text-sm text-slate-500">Net Salary</p>
            <p className="mt-2 text-2xl font-bold">Rs. {netTotal.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={18} />
              Loading payroll...
            </div>
          ) : payrollRows.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
              <Users size={32} className="mb-4 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">No payroll data</h2>
              <p className="mt-2 text-sm text-slate-500">Add staff and salary config to see payroll here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-3 font-medium">Staff</th>
                    <th className="px-3 py-3 font-medium">Role</th>
                    <th className="px-3 py-3 font-medium">Basic</th>
                    <th className="px-3 py-3 font-medium">Allowance</th>
                    <th className="px-3 py-3 font-medium">Deductions</th>
                    <th className="px-3 py-3 font-medium text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-3 py-3 text-slate-700">
                        <div>
                          <p className="font-medium text-slate-900">{row.fullName}</p>
                          <p className="text-xs text-slate-500">{row.staffCode}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{row.role}</td>
                      <td className="px-3 py-3 text-slate-700">Rs. {Number(row.basicSalary ?? 0).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-3 text-slate-700">Rs. {Number(row.allowance ?? 0).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-3 text-slate-700">Rs. {(row.deduction + row.tax).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-900">Rs. {row.net.toLocaleString("en-IN")}</td>
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