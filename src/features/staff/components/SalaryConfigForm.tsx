import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { getStaff } from "../services/staff.service";
import type { Staff } from "../types/staff.types";

import {
  salaryConfigSchema,
  type SalaryConfigFormData,
} from "../schemas/salaryConfig.schema";

type SalaryConfigFormProps = {
  initialData?: Partial<SalaryConfigFormData>;
  onSubmit: (data: SalaryConfigFormData) => Promise<void>;
  submitLabel?: string;
};

export default function SalaryConfigForm({
  initialData,
  onSubmit,
  submitLabel = "Save Configuration",
}: SalaryConfigFormProps) {
  const {
    register,
    setValue,
    handleSubmit,
    watch,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<SalaryConfigFormData>({
    resolver: zodResolver(salaryConfigSchema) as any,

    defaultValues: {
      staffId: "",
      staffName: "",
      role: "",
      salaryType: "Monthly",
      basicSalary: 0,
      expectedWorkingDays: 26,
      allowance: 0,
      overtimeRate: 0,
      bonus: 0,
      deduction: 0,
      tax: 0,
      status: "Active",
      ...initialData,
    },
  });
  const [staff, setStaff] = useState<Staff[]>([]);
  useEffect(() => {
    void getStaff().then((items) => setStaff(items.filter((item) => item.status !== "Inactive")));
  }, []);

  const basic = watch("basicSalary") || 0;
  const allowance = watch("allowance") || 0;
  const bonus = watch("bonus") || 0;
  const deduction = watch("deduction") || 0;
  const salaryType = watch("salaryType");
  const rateLabel = salaryType === "Hourly"
    ? "Hourly Rate"
    : salaryType === "Per Class"
      ? "Rate per Session"
      : "Monthly Salary";

  const total = basic + allowance + bonus - deduction;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8"
    >
      <div className="rounded-2xl border bg-white p-6 shadow-sm">

        <h2 className="mb-6 text-2xl font-semibold">
          Salary Configuration
        </h2>

        <div className="grid gap-6 lg:grid-cols-2">

          <div>
            <label className="mb-2 block font-medium">
              Staff Member
            </label>
            <select {...register("staffId", { onChange: (event) => { const selected = staff.find((item) => item.id === event.target.value); setValue("staffName", selected?.fullName ?? ""); setValue("role", selected?.designation ?? ""); } })} className="w-full rounded-xl border px-4 py-3" required>
              <option value="">Select staff member</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.fullName} ({item.staffCode})</option>)}
            </select>
            <p className="text-sm text-red-500">{errors.staffId?.message}</p>
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Salary Type
            </label>

            <select
              {...register("salaryType")}
              className="w-full rounded-xl border px-4 py-3"
            >
              <option>Monthly</option>
              <option>Hourly</option>
              <option>Per Class</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block font-medium">
              {rateLabel}
            </label>

            <input
              type="number"
              {...register("basicSalary", {
                valueAsNumber: true,
              })}
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Expected Working Days / Month
            </label>
            <input
              type="number"
              min="1"
              {...register("expectedWorkingDays", { valueAsNumber: true })}
              className="w-full rounded-xl border px-4 py-3"
            />
            <p className="mt-1 text-xs text-slate-500">Used to prorate monthly salary.</p>
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Allowance
            </label>

            <input
              type="number"
              {...register("allowance", {
                valueAsNumber: true,
              })}
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Overtime Rate
            </label>

            <input
              type="number"
              {...register("overtimeRate", {
                valueAsNumber: true,
              })}
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Bonus
            </label>

            <input
              type="number"
              {...register("bonus", {
                valueAsNumber: true,
              })}
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Deduction
            </label>

            <input
              type="number"
              {...register("deduction", {
                valueAsNumber: true,
              })}
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Tax %
            </label>

            <input
              type="number"
              {...register("tax", {
                valueAsNumber: true,
              })}
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Status
            </label>

            <select
              {...register("status")}
              className="w-full rounded-xl border px-4 py-3"
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

        </div>

        <div className="mt-8 rounded-xl bg-blue-50 p-5">

          <h3 className="mb-4 text-lg font-semibold">
            Salary Summary
          </h3>

          <div className="space-y-2">

            <div className="flex justify-between">
              <span>Basic Salary</span>
              <strong>Rs. {basic}</strong>
            </div>

            <div className="flex justify-between">
              <span>Allowance</span>
              <strong>Rs. {allowance}</strong>
            </div>

            <div className="flex justify-between">
              <span>Bonus</span>
              <strong>Rs. {bonus}</strong>
            </div>

            <div className="flex justify-between">
              <span>Deduction</span>
              <strong>Rs. {deduction}</strong>
            </div>

            <hr />

            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>Rs. {total}</span>
            </div>

          </div>

        </div>

      </div>

      <div className="flex justify-end">

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>

      </div>

    </form>
  );
}