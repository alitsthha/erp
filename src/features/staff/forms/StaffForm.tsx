import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  staffSchema,
  type StaffFormData,
} from "../schemas/staff.schema";

import PersonalInformation from "./PersonalInformation";
import EmploymentInformation from "./EmploymentInformation";
import SalaryInformation from "./SalaryInformation";

type StaffFormProps = {
  initialData?: Partial<StaffFormData>;
  onSave: (data: StaffFormData) => Promise<void>;
  submitLabel?: string;
};

export default function StaffForm({
  initialData,
  onSave,
  submitLabel = "Save Staff",
}: StaffFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),

    defaultValues: {
      status: "Active",
      employmentType: "Full Time",
      salaryType: "Monthly",
      allowance: 0,
      basicSalary: 0,
      overtimeRate: 0,

      ...initialData,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSave)}
      className="space-y-8"
    >
      <PersonalInformation
        register={register}
        errors={errors}
      />

      <EmploymentInformation
        register={register}
        errors={errors}
      />

      <SalaryInformation
        register={register}
        errors={errors}
        watch={watch}
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}