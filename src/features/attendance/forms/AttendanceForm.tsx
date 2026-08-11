import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Save,
  UserRound,
  X,
} from "lucide-react";

import type { Attendance } from "@/features/attendance/types/attendance.types";
import type { AttendanceFormData } from "@/features/attendance/schemas/attendance.schema";
import { attendanceSchema } from "@/features/attendance/schemas/attendance.schema";

import type { Enrollment } from "@/features/enrollments/types/enrollment.types";

import { getCurrentBSDate } from "@/utils/nepali-date";
import BsDateSelect from "@/components/forms/BsDateSelect";

interface AttendanceFormProps {
  enrollments: Enrollment[];
  initialData?: Attendance;
  onSubmit: (
    data: AttendanceFormData & {
      enrollmentId?: string;
      sessionDate?: string;
    }
  ) => Promise<void>;
  isLoading?: boolean;
}

export default function AttendanceForm({
  enrollments,
  initialData,
  onSubmit,
  isLoading = false,
}: AttendanceFormProps) {
  const navigate = useNavigate();

  const {
    register,
    control,
    watch,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema) as any,

    defaultValues: {
      enrollmentId: initialData?.enrollmentId ?? "",
      sessionDate:
        initialData?.sessionDateBS ??
        initialData?.sessionDate ??
        getCurrentBSDate(),
      status: initialData?.status ?? "Present",
      sessionFee: initialData?.sessionFee ?? 0,
      notes: initialData?.notes ?? "",
    },
  });

  const enrollmentId = watch("enrollmentId");
  const status = watch("status");

  const selectedEnrollment = useMemo(
    () =>
      enrollments.find(
        (enrollment) => enrollment.id === enrollmentId
      ),
    [enrollmentId, enrollments]
  );

  /**
   * Automatically load the session fee
   * from the selected enrollment.
   */
  useEffect(() => {
    if (selectedEnrollment?.sessionFee !== undefined) {
      setValue(
        "sessionFee",
        Number(selectedEnrollment.sessionFee) || 0
      );
    }
  }, [selectedEnrollment, setValue]);

  /**
   * Submit attendance.
   */
  const handleFormSubmit = async (
    data: AttendanceFormData
  ) => {
    try {
      await onSubmit({
        ...data,
        enrollmentId: data.enrollmentId,
        sessionDate: data.sessionDate,
      });

      /**
       * Reset only when this is an add form.
       * On edit, the parent page will navigate away.
       */
      if (!initialData) {
        reset({
          enrollmentId: "",
          sessionDate: getCurrentBSDate(),
          status: "Present",
          sessionFee: 0,
          notes: "",
        });
      }
    } catch (error) {
      console.error(
        "Error submitting attendance:",
        error
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
    >
      {/* =====================================================
          ATTENDANCE INFORMATION
      ====================================================== */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <BadgeCheck size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Attendance Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select an enrollment, attendance date, and
                attendance status.
              </p>
            </div>
          </div>
        </div>

        {/* Form body */}
        <div className="space-y-6 p-4 sm:p-6">
          {/* Enrollment */}
          <div>
            <label
              htmlFor="enrollmentId"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <BookOpen size={16} />
              Enrollment
              <span className="text-red-500">*</span>
            </label>

            <select
              id="enrollmentId"
              {...register("enrollmentId")}
              disabled={!!initialData || isLoading}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                Select an enrollment
              </option>

              {enrollments.map((enrollment) => (
                <option
                  key={enrollment.id}
                  value={enrollment.id || ""}
                >
                  {enrollment.studentName} —{" "}
                  {enrollment.activityName} (
                  {enrollment.enrollmentCode})
                </option>
              ))}
            </select>

            {errors.enrollmentId && (
              <p className="mt-2 text-sm text-red-500">
                {errors.enrollmentId.message}
              </p>
            )}

            {initialData && (
              <p className="mt-2 text-xs text-slate-500">
                Enrollment cannot be changed while editing
                attendance.
              </p>
            )}
          </div>

          {/* Selected Enrollment */}
          {selectedEnrollment && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
                  <UserRound size={18} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Selected Enrollment
                  </p>

                  <p className="text-xs text-slate-500">
                    Enrollment information
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Student
                  </p>

                  <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {selectedEnrollment.studentName}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Student Code
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedEnrollment.studentCode}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Activity
                  </p>

                  <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {selectedEnrollment.activityName}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Enrollment Code
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedEnrollment.enrollmentCode}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Date + Status */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* BS Date */}
            <div>
              <Controller
                name="sessionDate"
                control={control}
                render={({ field }) => (
                  <BsDateSelect
                    label="Session Date (BS)"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    error={errors.sessionDate?.message}
                    disabled={isLoading}
                    helperText="Select the attendance date in Nepali calendar."
                  />
                )}
              />
            </div>

            {/* Status */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <BadgeCheck size={16} />
                Attendance Status
                <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Present */}
                <label
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    status === "Present"
                      ? "border-green-500 bg-green-50 ring-2 ring-green-100"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  } ${
                    isLoading
                      ? "cursor-not-allowed opacity-60"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    value="Present"
                    {...register("status")}
                    disabled={isLoading}
                    className="sr-only"
                  />

                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        status === "Present"
                          ? "bg-green-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <BadgeCheck size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Present
                      </p>

                      <p className="text-xs text-slate-500">
                        Student attended
                      </p>
                    </div>
                  </div>
                </label>

                {/* Absent */}
                <label
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    status === "Absent"
                      ? "border-red-500 bg-red-50 ring-2 ring-red-100"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  } ${
                    isLoading
                      ? "cursor-not-allowed opacity-60"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    value="Absent"
                    {...register("status")}
                    disabled={isLoading}
                    className="sr-only"
                  />

                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        status === "Absent"
                          ? "bg-red-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <X size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Absent
                      </p>

                      <p className="text-xs text-slate-500">
                        Student did not attend
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {errors.status && (
                <p className="mt-2 text-sm text-red-500">
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>

          {/* Session Fee */}
          <div>
            <label
              htmlFor="sessionFee"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <CircleDollarSign size={16} />
              Session Fee
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                Rs.
              </span>

              <input
                id="sessionFee"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                {...register("sessionFee", {
                  setValueAs: (value) =>
                    value === "" ? 0 : Number(value),
                })}
                disabled={isLoading}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              The session fee is automatically loaded from
              the selected enrollment when available.
            </p>

            {errors.sessionFee && (
              <p className="mt-1 text-sm text-red-500">
                {errors.sessionFee.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <FileText size={16} />
              Notes
            </label>

            <textarea
              id="notes"
              rows={4}
              {...register("notes")}
              disabled={isLoading}
              placeholder="Add any additional notes about this attendance..."
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />

            {errors.notes && (
              <p className="mt-1 text-sm text-red-500">
                {errors.notes.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          QUICK SUMMARY
      ====================================================== */}
      {selectedEnrollment && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <CalendarDays size={19} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Attendance Summary
              </p>

              <p className="truncate text-sm font-semibold text-slate-900">
                {selectedEnrollment.studentName}
              </p>
            </div>

            <div className="ml-auto shrink-0">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  status === "Present"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {status}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          ACTIONS
      ====================================================== */}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => navigate("/attendance")}
          disabled={isLoading}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <X size={17} />
          Cancel
        </button>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <Save size={17} />

          {isLoading
            ? "Saving..."
            : initialData
              ? "Update Attendance"
              : "Save Attendance"}
        </button>
      </div>
    </form>
  );
}