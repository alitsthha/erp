import type {
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import { Briefcase, CheckCircle } from "lucide-react";

import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";
import type { StaffFormData } from "../schemas/staff.schema";

type Props = {
  register: UseFormRegister<StaffFormData>;
  errors: FieldErrors<StaffFormData>;
  value?: string;
  onChange?: (value: string) => void;
};

export default function EmploymentInformation({
  register,
  errors,
  value = "",
  onChange,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Joining Date */}
      <div>
        <label
          htmlFor="joiningDate"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Joining Date <span className="text-red-500">*</span>
        </label>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <NepaliDatePickerInput
            label=""
            value={value}
            onChange={(nextValue) => onChange?.(nextValue)}
            helperText="Select joining date in BS"
            error={errors.joiningDate?.message?.toString()}
          />
        </div>

        {errors.joiningDate && (
          <p className="mt-1.5 text-xs font-medium text-red-500">
            {errors.joiningDate.message}
          </p>
        )}
      </div>

      {/* Employment Type */}
      <div>
        <label
          htmlFor="employmentType"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Employment Type <span className="text-red-500">*</span>
        </label>

        <div className="relative">
          <Briefcase
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <select
            id="employmentType"
            {...register("employmentType")}
            className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:ring-2 ${
              errors.employmentType
                ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
            }`}
          >
            <option value="">Select Employment Type</option>
            <option value="Full Time">Full Time</option>
            <option value="Part Time">Part Time</option>
            <option value="Contract">Contract</option>
            <option value="Temporary">Temporary</option>
            <option value="Volunteer">Volunteer</option>
          </select>
        </div>

        {errors.employmentType && (
          <p className="mt-1.5 text-xs font-medium text-red-500">
            {errors.employmentType.message}
          </p>
        )}
      </div>

      {/* Status */}
      <div>
        <label
          htmlFor="status"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Status <span className="text-red-500">*</span>
        </label>

        <div className="relative">
          <CheckCircle
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <select
            id="status"
            {...register("status")}
            className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:ring-2 ${
              errors.status
                ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
            }`}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Resigned">Resigned</option>
          </select>
        </div>

        {errors.status && (
          <p className="mt-1.5 text-xs font-medium text-red-500">
            {errors.status.message}
          </p>
        )}
      </div>
    </div>
  );
}