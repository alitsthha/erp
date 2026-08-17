import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  DollarSign,
  Loader2,
  Users,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { getStaff } from "@/features/staff/services/staff.service";
import { getSalaryConfigs } from "@/features/staff/services/salaryConfig.service";
import type { Staff } from "@/features/staff/types/staff.types";
import type { SalaryConfig } from "@/features/staff/types/salaryConfig.types";

function formatCurrency(value: number): string {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

export default function PayrollPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<SalaryConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [staffList, configList] = await Promise.all([
          getStaff(),
          getSalaryConfigs(),
        ]);

        setStaff(staffList.filter((member) => member.status !== "Inactive"));
        setSalaryConfigs(configList.filter((config) => config.status === "Active"));
      } catch (error) {
        console.error("Failed to load payroll data:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  // Calculate payroll summary
  const payrollSummary = useMemo(() => {
    const totalStaff = staff.length;
    const totalBasicSalary = salaryConfigs.reduce((sum, config) => sum + (config.basicSalary || 0), 0);
    const totalAllowance = salaryConfigs.reduce((sum, config) => sum + (config.allowance || 0), 0);
    const totalDeduction = salaryConfigs.reduce((sum, config) => sum + (config.deduction || 0), 0);
    const totalTax = salaryConfigs.reduce((sum, config) => sum + (config.tax || 0), 0);
    const totalNetPayroll = totalBasicSalary + totalAllowance - totalDeduction - totalTax;

    return {
      totalStaff,
      totalBasicSalary,
      totalAllowance,
      totalDeduction,
      totalTax,
      totalNetPayroll,
    };
  }, [staff, salaryConfigs]);

  // Salary type distribution
  const salaryTypeChart = useMemo(() => {
    const distribution: Record<string, number> = {};

    salaryConfigs.forEach((config) => {
      distribution[config.salaryType] = (distribution[config.salaryType] || 0) + 1;
    });

    return Object.entries(distribution).map(([type, count]) => ({
      name: type,
      value: count,
      color: type === "Monthly" ? "#3b82f6" : type === "Hourly" ? "#8b5cf6" : "#f59e0b",
    }));
  }, [salaryConfigs]);

  // Salary component breakdown
  const salaryComponentChart = useMemo(() => {
    return [
      { name: "Basic Salary", value: payrollSummary.totalBasicSalary, color: "#10b981" },
      { name: "Allowance", value: payrollSummary.totalAllowance, color: "#3b82f6" },
      { name: "Deduction", value: payrollSummary.totalDeduction, color: "#ef4444" },
      { name: "Tax", value: payrollSummary.totalTax, color: "#f97316" },
    ].filter((item) => item.value > 0);
  }, [payrollSummary]);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate("/finance")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Finance
          </button>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Payroll</h1>
              <p className="mt-1 text-sm text-slate-500 sm:text-base">
                Manage staff salary structures, configurations, and payroll analysis.
              </p>
            </div>

            <button
              onClick={() => navigate("/accounting/salary-config")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto"
            >
              <Briefcase size={16} />
              Salary Config
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-96 items-center justify-center">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Active Staff</p>
                    <p className="mt-3 text-2xl font-bold text-slate-900">
                      {payrollSummary.totalStaff}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100">
                    <Users size={20} className="text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Basic Salary</p>
                    <p className="mt-3 truncate text-lg font-bold text-slate-900">
                      {formatCurrency(payrollSummary.totalBasicSalary)}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100">
                    <DollarSign size={20} className="text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Allowance</p>
                    <p className="mt-3 truncate text-lg font-bold text-slate-900">
                      {formatCurrency(payrollSummary.totalAllowance)}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-100">
                    <Wallet size={20} className="text-violet-600" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Net Payroll</p>
                    <p className="mt-3 truncate text-lg font-bold text-slate-900">
                      {formatCurrency(payrollSummary.totalNetPayroll)}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100">
                    <BarChart3 size={20} className="text-amber-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              {/* Salary Type Distribution */}
              {salaryTypeChart.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    Salary Type Distribution
                  </h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={salaryTypeChart}
                          dataKey="value"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                        >
                          {salaryTypeChart.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `${value} roles`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {salaryTypeChart.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-slate-600">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {item.value} roles
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Salary Component Breakdown */}
              {salaryComponentChart.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    Total Salary Breakdown
                  </h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salaryComponentChart}>
                        <CartesianGrid stroke="#e2e8f0" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          angle={-15}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          tickFormatter={(val) => `Rs. ${(val / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value: any) => [
                            formatCurrency(value),
                            "Amount",
                          ]}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {salaryComponentChart.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Staff Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Staff Payroll</h2>

              {staff.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                  <Users size={32} className="mb-4 text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900">No active staff</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Add staff members to manage their payroll.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-5 py-3 font-medium">Staff Name</th>
                        <th className="px-5 py-3 font-medium">Email</th>
                        <th className="px-5 py-3 font-medium">Employment Type</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {staff.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <div>
                              <p className="font-medium text-slate-900">
                                {member.fullName}
                              </p>
                              <p className="text-xs text-slate-500">{member.staffCode}</p>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-700">
                            {member.email ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-slate-700">
                            {member.employmentType}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                member.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : member.status === "Inactive"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {member.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => navigate(`/staff/payment/${member.id}`)}
                              className="text-blue-600 transition hover:text-blue-700 hover:underline"
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
          </>
        )}
      </div>
    </div>
  );
}