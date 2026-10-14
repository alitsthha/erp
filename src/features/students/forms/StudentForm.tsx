import SearchableSelect from "@/components/forms/SearchableSelect";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  FileText,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
} from "lucide-react";

import {
  studentSchema,
  type StudentFormData,
} from "../schemas/student.schema";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";
import { formatPersonName } from "@/utils/person-name";

type StudentFormProps = {
  initialData?: Partial<StudentFormData>;
  onSubmit: (data: StudentFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
};

export default function StudentForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save Student",
}: StudentFormProps) {
  const {
    register,
    watch,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      guardianName: "",
      guardianPhone: "",
      guardianEmail: "",
      status: "Active",
      address: "",
      joiningDateBS: "",
      note: "",
      parentName: "",
      parentPhone: "",
      parentEmail: "",
      studentEmail: "",
      gender: "Male",
      dateOfBirth: "",
      admissionDate: "",
    },
  });

  useEffect(() => {
    const safeInitialData: StudentFormData = {
      fullName: initialData?.fullName ?? "",
      guardianName: initialData?.guardianName ?? initialData?.parentName ?? "",
      guardianPhone: initialData?.guardianPhone ?? initialData?.parentPhone ?? "",
      guardianEmail: initialData?.guardianEmail ?? initialData?.parentEmail ?? "",
      parentName: initialData?.parentName ?? "",
      parentPhone: initialData?.parentPhone ?? "",
      parentEmail: initialData?.parentEmail ?? "",
      studentEmail: initialData?.studentEmail ?? "",
      gender: initialData?.gender ?? "Male",
      dateOfBirth: initialData?.dateOfBirth ?? "",
      admissionDate: initialData?.admissionDate ?? "",
      status: initialData?.status ?? "Active",
      address: initialData?.address ?? "",
      joiningDateBS: initialData?.joiningDateBS ?? "",
      note: initialData?.note ?? "",
    };

    reset(safeInitialData);
  }, [initialData, reset]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="ui-page mx-auto w-full space-y-6"
    >
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <div className="ui-surface overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                <User size={22} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Student Management
                </p>

                <h1 className="ui-page-title mt-1">
                  Add Student
                </h1>

                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Create a clean student profile with essential contact,
                  enrollment and account information.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 size={14} />
              Ready to register
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          BASIC INFORMATION
      ====================================================== */}
      <section className="ui-surface">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
              <User size={18} />
            </div>

            <div>
              <h2 className="ui-section-title">
                Basic Information
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Student identity, joining date, and current status.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:p-7 md:grid-cols-2 lg:gap-6">
          {/* Full Name */}
          <div className="md:col-span-2">
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Full Name <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <User
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="fullName"
                type="text"
                placeholder="Enter student's full name"
                autoComplete="name"
                {...register("fullName", {
                  onBlur: (event) => setValue("fullName", formatPersonName(event.target.value), { shouldValidate: true }),
                })}
                className={`ui-field w-full bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.fullName
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-brand-600 focus:ring-brand-50"
                }`}
              />
            </div>

            {errors.fullName && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Status
            </label>

            <div className="relative">
              <CheckCircle2
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <SearchableSelect value={watch("status")}
                id="status"
                {...register("status")}
                className="ui-field w-full appearance-none pl-10 pr-4 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </SearchableSelect>
            </div>
          </div>

          {/* Joining Date */}
          <div>
            <label
              htmlFor="joiningDateBS"
              className="mb-2 flex items-center gap-1 text-sm font-medium text-slate-700"
            >
              Joining Date (BS) <span className="text-red-500">*</span>
            </label>

            <Controller
              name="joiningDateBS"
              control={control}
              render={({ field }) => (
                <NepaliDatePickerInput
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  required
                  error={errors.joiningDateBS?.message}
                  helperText="Select the student's joining date in BS."
                />
              )}
            />

            {errors.joiningDateBS && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.joiningDateBS.message}
              </p>
            )}
            
            {!errors.joiningDateBS && (
              <p className="mt-1.5 text-xs text-slate-500">
                Nepali date in <span className="font-mono font-medium text-slate-600">YYYY-MM-DD</span> format (e.g., 2083-04-22)
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          GUARDIAN INFORMATION
      ====================================================== */}
      <section className="ui-surface">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
              <Users size={18} />
            </div>

            <div>
              <h2 className="ui-section-title">
                Guardian Information
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Primary contact and parent/guardian details.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:p-7 md:grid-cols-2 lg:gap-6">
          {/* Guardian Name */}
          <div>
            <label
              htmlFor="guardianName"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Guardian Name <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <Users
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="guardianName"
                type="text"
                placeholder="Enter guardian name"
                autoComplete="name"
                {...register("guardianName", {
                  onBlur: (event) => setValue("guardianName", formatPersonName(event.target.value), { shouldValidate: true }),
                })}
                className={`ui-field w-full bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.guardianName
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-brand-600 focus:ring-brand-50"
                }`}
              />
            </div>

            {errors.guardianName && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.guardianName.message}
              </p>
            )}
          </div>

          {/* Guardian Phone */}
          <div>
            <label
              htmlFor="guardianPhone"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Contact Number <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <Phone
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="guardianPhone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                aria-describedby="guardianPhone-help"
                aria-invalid={Boolean(errors.guardianPhone)}
                placeholder="98XXXXXXXX"
                autoComplete="tel"
                {...register("guardianPhone")}
                className={`ui-field w-full bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.guardianPhone
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-brand-600 focus:ring-brand-50"
                }`}
              />
            </div>

            <p id="guardianPhone-help" className="mt-1.5 text-xs text-slate-500">
              Enter 10 digits starting with 98, for example 9812345678.
            </p>
            {errors.guardianPhone && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.guardianPhone.message}
              </p>
            )}
          </div>

          {/* Guardian Email */}
          {initialData?.parentPhone && (
            <div>
              <label htmlFor="parentPhone" className="mb-2 block text-sm font-medium text-slate-700">
                Additional Parent Contact (Optional)
              </label>
              <input
                id="parentPhone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98XXXXXXXX"
                {...register("parentPhone")}
                aria-invalid={Boolean(errors.parentPhone)}
                className="ui-field w-full px-4 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-50"
              />
              {errors.parentPhone && <p className="mt-1.5 text-xs text-red-500">{errors.parentPhone.message}</p>}
            </div>
          )}
          <div className="md:col-span-2">
            <label
              htmlFor="guardianEmail"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Guardian Email
              <span className="ml-1 text-xs font-normal text-slate-400">
                (Optional)
              </span>
            </label>

            <div className="relative">
              <Mail
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="guardianEmail"
                type="email"
                placeholder="guardian@example.com"
                autoComplete="email"
                {...register("guardianEmail")}
                className={`ui-field w-full bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.guardianEmail
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-brand-600 focus:ring-brand-50"
                }`}
              />
            </div>

            {errors.guardianEmail && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.guardianEmail.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          ADDRESS
      ====================================================== */}
      <section className="ui-surface">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <MapPin size={18} />
            </div>

            <div>
              <h2 className="ui-section-title">
                Address
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Residential address for official records.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <label
            htmlFor="address"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Current Address
          </label>

          <div className="relative">
            <MapPin
              size={17}
              className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
            />

            <textarea
              id="address"
              rows={3}
              placeholder="Enter current address"
              autoComplete="street-address"
              {...register("address")}
              className={`w-full resize-none rounded-lg border bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                errors.address
                  ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                  : "border-slate-300 focus:border-brand-600 focus:ring-brand-50"
              }`}
            />
          </div>

          {errors.address && (
            <p className="mt-1.5 text-xs font-medium text-red-500">
              {errors.address.message}
            </p>
          )}
        </div>
      </section>

      {/* =====================================================
          NOTE
      ====================================================== */}
      <section className="ui-surface">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
              <FileText size={18} />
            </div>

            <div>
              <h2 className="ui-section-title">
                Additional Notes
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Optional information about this student.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <label
            htmlFor="note"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Additional Note
          </label>

          <textarea
            id="note"
            rows={4}
            placeholder="Write any useful information about this student..."
            {...register("note")}
            className={`w-full resize-none rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
              errors.note
                ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                : "border-slate-300 focus:border-brand-600 focus:ring-brand-50"
            }`}
          />

          {errors.note && (
            <p className="mt-1.5 text-xs font-medium text-red-500">
              {errors.note.message}
            </p>
          )}
        </div>
      </section>

      {/* =====================================================
          ACTION BAR
      ====================================================== */}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-end sm:px-7">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="ui-button inline-flex w-full items-center justify-center border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-7 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
