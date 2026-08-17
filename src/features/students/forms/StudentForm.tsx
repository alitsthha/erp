import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
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
    handleSubmit,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
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
      className="mx-auto w-full max-w-5xl space-y-5"
    >
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <User size={22} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Student Management
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
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
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-blue-25 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <User size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
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
                {...register("fullName")}
                className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.fullName
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
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

              <select
                id="status"
                {...register("status")}
                className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
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

            <div className="relative">
              <CalendarDays
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="joiningDateBS"
                type="text"
                placeholder="2083-04-22"
                {...register("joiningDateBS")}
                className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.joiningDateBS
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
                }`}
              />
            </div>

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
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-violet-25 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Users size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
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
                {...register("guardianName")}
                className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.guardianName
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
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
                inputMode="tel"
                placeholder="98XXXXXXXX"
                autoComplete="tel"
                {...register("guardianPhone")}
                className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.guardianPhone
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
                }`}
              />
            </div>

            {errors.guardianPhone && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.guardianPhone.message}
              </p>
            )}
          </div>

          {/* Guardian Email */}
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
                className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.guardianEmail
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
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
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50 to-amber-25 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <MapPin size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
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
              className={`w-full resize-none rounded-xl border bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                errors.address
                  ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                  : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
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
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-25 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
              <FileText size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
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
            className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
              errors.note
                ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
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
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-7 text-sm font-medium text-white shadow-sm transition hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}