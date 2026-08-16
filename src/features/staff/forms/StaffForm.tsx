import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Briefcase, CheckCircle2 } from "lucide-react";

import {
  staffSchema,
  type StaffFormData,
} from "../schemas/staff.schema";

import PersonalInformation from "./PersonalInformation";
import EmploymentInformation from "./EmploymentInformation";

type StaffFormProps = {
  initialData?: Partial<StaffFormData>;
  onSave: (data: StaffFormData) => Promise<void>;
  submitLabel?: string;
  onCancel?: () => void;
};

export default function StaffForm({
  initialData,
  onSave,
  submitLabel = "Add Staff",
  onCancel,
}: StaffFormProps) {
  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),

    defaultValues: {
      status: "Active",
      employmentType: "Full Time",
      ...initialData,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSave)}
      className="mx-auto w-full max-w-5xl space-y-5"
    >
      {/* ===== PAGE HEADER ===== */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Briefcase size={22} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Staff Management
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {initialData?.fullName ? "Edit Staff" : "Add Staff"}
                </h1>

                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  {initialData?.fullName 
                    ? "Update staff member information."
                    : "Add a new staff member with essential contact and employment information."}
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 size={14} />
              Ready to save
            </div>
          </div>
        </div>
      </div>

      {/* ===== PERSONAL INFORMATION SECTION ===== */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <User size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Personal Information
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Basic identity and contact details.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <PersonalInformation
            register={register}
            errors={errors}
          />
        </div>
      </section>

      {/* ===== EMPLOYMENT INFORMATION SECTION ===== */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Briefcase size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Employment Information
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Employment type, status and joining date.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <EmploymentInformation
            register={register}
            errors={errors}
          />
        </div>
      </section>

      {/* ===== FORM ACTIONS ===== */}
      <div className="flex gap-3 sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex flex-1 items-center justify-center rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50 sm:flex-none"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 sm:flex-none"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}