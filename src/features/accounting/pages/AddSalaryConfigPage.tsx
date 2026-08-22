import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, DollarSign, Save, X } from "lucide-react";

import {
  salaryConfigSchema,
  type SalaryConfigFormData,
} from "@/features/staff/schemas/salaryConfig.schema";
import { addSalaryConfig } from "@/features/staff/services/salaryConfig.service";
import { getStaff } from "@/features/staff/services/staff.service";
import type { Staff } from "@/features/staff/types/staff.types";
import PageHeader from "@/components/common/AddPageHeader";

export default function AddSalaryConfigPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<Staff[]>([]);
  useEffect(() => {
    void getStaff().then((items) => setStaff(items.filter((item) => item.status !== "Inactive")));
  }, []);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(salaryConfigSchema),
    defaultValues: {
      staffId: "",
      staffName: "",
      role: "",
      salaryType: "Monthly",
      basicSalary: 0,
      allowance: 0,
      overtimeRate: 0,
      bonus: 0,
      deduction: 0,
      tax: 0,
      status: "Active",
    },
  });

  async function onSubmit(data: unknown) {
    const formData = data as SalaryConfigFormData;
    try {
      await addSalaryConfig(formData);
      navigate("/accounting/salary-config");
    } catch (error) {
      console.error("Failed to add salary config:", error);
      alert("Failed to add salary configuration. Please try again.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Add Salary Configuration"
        description="Assign a salary structure to a specific staff member."
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        {/* Basic Information */}
        <div className="border-b border-slate-200 pb-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Briefcase size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Staff Salary Information
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Assign a salary structure to one staff member.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Staff Member */}
            <div className="md:col-span-2">
              <label
                htmlFor="staffId"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Staff Member <span className="text-red-500">*</span>
              </label>
              <select
                id="staffId"
                {...register("staffId", { onChange: (event) => { const selected = staff.find((item) => item.id === event.target.value); setValue("staffName", selected?.fullName ?? ""); setValue("role", selected?.designation ?? ""); } })}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition ${
                  errors.staffId
                    ? "border-red-300 focus:ring-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                }`}
                required
              >
                <option value="">Select staff member</option>
                {staff.map((member) => <option key={member.id} value={member.id}>{member.fullName} ({member.staffCode})</option>)}
              </select>
              {errors.staffId && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.staffId.message}
                </p>
              )}
            </div>

            {/* Salary Type */}
            <div>
              <label
                htmlFor="salaryType"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Salary Type <span className="text-red-500">*</span>
              </label>
              <select
                id="salaryType"
                {...register("salaryType")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="Monthly">Monthly</option>
                <option value="Hourly">Hourly</option>
                <option value="Per Class">Per Class</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Status
              </label>
              <select
                id="status"
                {...register("status")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Salary Components */}
        <div className="border-b border-slate-200 pb-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Salary Components
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Define earnings and deductions.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Basic Salary */}
            <div>
              <label
                htmlFor="basicSalary"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Basic Salary <span className="text-red-500">*</span>
              </label>
              <input
                id="basicSalary"
                type="number"
                step="0.01"
                placeholder="0"
                {...register("basicSalary")}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition ${
                  errors.basicSalary
                    ? "border-red-300 focus:ring-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                }`}
              />
              {errors.basicSalary && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {typeof errors.basicSalary.message === "string"
                    ? errors.basicSalary.message
                    : "Invalid basic salary"}
                </p>
              )}
            </div>

            {/* Allowance */}
            <div>
              <label
                htmlFor="allowance"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Allowance
              </label>
              <input
                id="allowance"
                type="number"
                step="0.01"
                placeholder="0"
                {...register("allowance")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Overtime Rate */}
            <div>
              <label
                htmlFor="overtimeRate"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Overtime Rate
              </label>
              <input
                id="overtimeRate"
                type="number"
                step="0.01"
                placeholder="0"
                {...register("overtimeRate")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Bonus */}
            <div>
              <label
                htmlFor="bonus"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Bonus
              </label>
              <input
                id="bonus"
                type="number"
                step="0.01"
                placeholder="0"
                {...register("bonus")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Deduction */}
            <div>
              <label
                htmlFor="deduction"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Deduction
              </label>
              <input
                id="deduction"
                type="number"
                step="0.01"
                placeholder="0"
                {...register("deduction")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Tax */}
            <div>
              <label
                htmlFor="tax"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Tax
              </label>
              <input
                id="tax"
                type="number"
                step="0.01"
                placeholder="0"
                {...register("tax")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate("/accounting/salary-config")}
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
          >
            <X size={16} />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            <Save size={16} />
            {isSubmitting ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}
