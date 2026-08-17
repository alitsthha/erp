import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, DollarSign, Users, BarChart3, Loader2, TrendingUp, TrendingDown } from "lucide-react";

import { getStaff } from "@/features/staff/services/staff.service";
import { getPayments } from "@/features/finance/services/payment.service";
import type { Payment } from "@/features/finance/types/payment.types";

function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

export default function AccountingPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    totalPayments: 0,
    paidAmount: 0,
    pendingAmount: 0,
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const staff = await getStaff();
        const allPayments = await getPayments();

        const staffPayments = allPayments.filter((p) => p.staffId);

        setPayments(staffPayments);

        const activeCount = staff.filter((s) => s.status === "Active").length;
        const totalPaid = staffPayments
          .filter((p) => p.status === "paid")
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalPending = staffPayments
          .filter((p) => p.status === "pending")
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        setStats({
          totalStaff: staff.length,
          activeStaff: activeCount,
          totalPayments: staffPayments.length,
          paidAmount: totalPaid,
          pendingAmount: totalPending,
        });
      } catch (error) {
        console.error("Failed to load accounting data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-900">Accounting & Payroll</h1>
            <p className="mt-1 text-sm text-slate-500">Manage staff payments, salary configurations, and accounting records</p>
          </div>
        </div>

        {/* Summary Stats */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 animate-spin" size={20} />
            <span className="text-slate-600">Loading accounting data...</span>
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Staff</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalStaff}</p>
                  </div>
                  <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
                    <Users size={20} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Active Staff</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-600">{stats.activeStaff}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600">
                    <Briefcase size={20} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Paid</p>
                    <p className="mt-2 text-xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
                  </div>
                  <div className="rounded-lg bg-green-100 p-3 text-green-600">
                    <TrendingUp size={20} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Pending Amount</p>
                    <p className="mt-2 text-xl font-bold text-orange-600">{formatCurrency(stats.pendingAmount)}</p>
                  </div>
                  <div className="rounded-lg bg-orange-100 p-3 text-orange-600">
                    <TrendingDown size={20} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Payments</p>
                    <p className="mt-2 text-2xl font-bold text-violet-600">{stats.totalPayments}</p>
                  </div>
                  <div className="rounded-lg bg-violet-100 p-3 text-violet-600">
                    <DollarSign size={20} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <BarChart3 size={20} />
                Quick Actions
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => navigate("/accounting/payroll")}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:border-blue-300"
                >
                  View Payroll
                </button>
                <button
                  onClick={() => navigate("/accounting/salary-config")}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:border-blue-300"
                >
                  Salary Configurations
                </button>
                <button
                  onClick={() => navigate("/accounting/salary-config/add")}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:border-blue-300"
                >
                  Add Salary Config
                </button>
                <button
                  onClick={() => navigate("/staff")}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:border-blue-300"
                >
                  Manage Staff
                </button>
              </div>
            </div>

            {/* Recent Payments */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Staff Payments</h2>
              {payments.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  <p>No payment records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Staff Name</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Amount</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 10).map((payment) => (
                        <tr key={payment.id} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-900">{payment.staffName || "—"}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(payment.amount)}</td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                              {payment.paymentType || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                payment.status === "paid"
                                  ? "bg-green-100 text-green-700"
                                  : payment.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {payment.status || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{payment.paymentDate || "—"}</td>
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
