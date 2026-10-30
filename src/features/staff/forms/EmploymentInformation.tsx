import SearchableSelect from "@/components/forms/SearchableSelect";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";
import { Briefcase, CheckCircle } from "lucide-react";

import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";
import type { StaffFormData } from "../schemas/staff.schema";

type Props = {
  register: UseFormRegister<StaffFormData>;
  watch: UseFormWatch<StaffFormData>;
  errors: FieldErrors<StaffFormData>;
  value?: string;
  onChange?: (value: string) => void;
};

export default function EmploymentInformation({
  register,
  watch,
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

        <div className="ui-surface p-3">
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
            className="ui-field-icon text-slate-400"
          />

          <SearchableSelect value={watch("employmentType")}
            id="employmentType"
            {...register("employmentType")}
            className={`ui-field w-full bg-white ui-field-leading pr-4 text-sm text-slate-900 outline-none transition focus:ring-2 ${
              errors.employmentType
                ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                : "border-slate-300 focus:border-brand-600 focus:ring-brand-50"
            }`}
          >
            <option value="">Select Employment Type</option>
            <option value="Full Time">Full Time</option>
            <option value="Part Time">Part Time</option>
            <option value="Contract">Contract</option>
            <option value="Temporary">Temporary</option>
            <option value="Volunteer">Volunteer</option>
          </SearchableSelect>
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
            className="ui-field-icon text-slate-400"
          />

          <SearchableSelect value={watch("status")}
            id="status"
            {...register("status")}
            className={`ui-field w-full bg-white ui-field-leading pr-4 text-sm text-slate-900 outline-none transition focus:ring-2 ${
              errors.status
                ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                : "border-slate-300 focus:border-brand-600 focus:ring-brand-50"
            }`}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Resigned">Resigned</option>
          </SearchableSelect>
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