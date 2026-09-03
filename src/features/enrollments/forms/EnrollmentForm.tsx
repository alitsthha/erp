import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  CheckCircle2,
  ClipboardList,
  FileText,
  User,
  Activity as ActivityIcon,
  BadgeDollarSign,
} from "lucide-react";

import { enrollmentSchema } from "../schemas/enrollment.schema";
import type { EnrollmentFormData } from "../schemas/enrollment.schema";

import {
  addEnrollment,
  getActivitiesForEnrollment,
  getStudentsForEnrollment,
  getEnrollmentById,
  updateEnrollment,
} from "../services/enrollment.service";

import type { Activity } from "@/features/activities/types/activity.types";
import type { Student } from "@/features/students/types/student.types";

import { convertADToBS, getCurrentBSDate } from "@/utils/nepali-date";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";

import { formatCurrency } from "@/utils/currency";

type Props = {
  enrollmentId?: string;
};

const normalizeToBs = (value?: string | null) => {
  if (!value) {
    return getCurrentBSDate();
  }

  const [year] = value.split("-");

  return Number(year) < 2000 ? convertADToBS(value) : value;
};

export default function EnrollmentForm({ enrollmentId }: Props) {
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema) as any,

    defaultValues: {
      studentId: "",
      activityId: "",
      enrollmentDate: getCurrentBSDate(),
      sessionFee: "",
      notes: "",
      status: "Active",
    },
  });

  const selectedStudentId = watch("studentId");
  const selectedActivityId = watch("activityId");
  const selectedStatus = watch("status");
  const selectedSessionFee = watch("sessionFee");

  const selectedStudent = useMemo(
    () =>
      students.find(
        (student) => student.id === selectedStudentId
      ),
    [students, selectedStudentId]
  );

  const selectedActivity = useMemo(
    () =>
      activities.find(
        (activity) => activity.id === selectedActivityId
      ),
    [activities, selectedActivityId]
  );

  /*
  ============================================================
  LOAD STUDENTS + ACTIVITIES
  ============================================================
  */

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);

        const [studentList, activityList] = await Promise.all([
          getStudentsForEnrollment(),
          getActivitiesForEnrollment(),
        ]);

        setStudents(studentList);
        setActivities(activityList);
      } catch (error) {
        console.error("Failed to load enrollment data:", error);
        alert("Failed to load students and activities.");
      } finally {
        setLoadingData(false);
      }
    };

    void loadData();
  }, []);

  /*
  ============================================================
  AUTO SET SESSION FEE FROM ACTIVITY
  ============================================================
  */

  useEffect(() => {
    if (!selectedActivity) {
      return;
    }

    const feePerSession =
      selectedActivity.feePerSession ??
      selectedActivity.sessionFee ??
      selectedActivity.fee ??
      0;

    if (feePerSession > 0) {
      setValue("sessionFee", String(feePerSession));
    }
  }, [selectedActivity, setValue]);

  /*
  ============================================================
  LOAD EXISTING ENROLLMENT
  ============================================================
  */

  useEffect(() => {
    if (!enrollmentId) {
      reset({
        studentId: "",
        activityId: "",
        enrollmentDate: getCurrentBSDate(),
        sessionFee: "",
        notes: "",
        status: "Active",
      });

      return;
    }

    const loadEnrollment = async () => {
      try {
        const enrollment = await getEnrollmentById(enrollmentId);

        if (!enrollment) {
          throw new Error("Enrollment not found.");
        }

        reset({
          studentId: enrollment.studentId,
          activityId: enrollment.activityId,
          enrollmentDate: normalizeToBs(enrollment.enrollmentDate),
          sessionFee:
            enrollment.sessionFee !== undefined
              ? String(enrollment.sessionFee)
              : "",
          notes: enrollment.notes ?? "",
          status: enrollment.status,
        });
      } catch (error) {
        console.error(error);
        alert("Failed to load enrollment.");
        navigate("/enrollments");
      }
    };

    void loadEnrollment();
  }, [enrollmentId, reset, navigate]);

  /*
  ============================================================
  SUBMIT
  ============================================================
  */

  const onSubmit = async (data: EnrollmentFormData) => {
    try {
      if (enrollmentId) {
        await updateEnrollment(enrollmentId, data);
        alert("Enrollment updated successfully!");
      } else {
        await addEnrollment(data);
        alert("Enrollment created successfully!");
      }

      reset({
        studentId: "",
        activityId: "",
        enrollmentDate: getCurrentBSDate(),
        sessionFee: "",
        notes: "",
        status: "Active",
      });

      navigate("/enrollments");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save enrollment."
      );
    }
  };

  /*
  ============================================================
  LOADING
  ============================================================
  */

  if (loadingData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

        <p className="mt-4 text-sm font-medium text-slate-700">
          Loading enrollment data...
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Preparing students and activities.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      {/* ======================================================
          MAIN INFORMATION
      ======================================================= */}

      <section className="relative overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Section Header */}

        <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ClipboardList size={19} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Enrollment Details
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Select a student, activity, enrollment date, and session fee.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}

        <div className="grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-2">
          {/* Student */}

          <div>
            <label
              htmlFor="studentId"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Student <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <User
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                id="studentId"
                {...register("studentId")}
                className={`h-11 w-full appearance-none rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                  errors.studentId
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
                }`}
              >
                <option value="">
                  Select student
                </option>

                {students.map((student) => (
                  <option
                    key={student.id}
                    value={student.id}
                  >
                    {student.studentCode} - {student.fullName}
                  </option>
                ))}
              </select>
            </div>

            {errors.studentId && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.studentId.message}
              </p>
            )}

            {selectedStudent && (
              <div className="mt-2 text-xs text-slate-400">
                Selected:{" "}
                <span className="font-medium text-slate-600">
                  {selectedStudent.fullName}
                </span>
              </div>
            )}
          </div>

          {/* Activity */}

          <div>
            <label
              htmlFor="activityId"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Activity <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <ActivityIcon
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                id="activityId"
                {...register("activityId")}
                className={`h-11 w-full appearance-none rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                  errors.activityId
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
                }`}
              >
                <option value="">
                  Select activity
                </option>

                {activities
                  .filter(
                    (activity) =>
                      activity.status === "Active"
                  )
                  .map((activity) => (
                    <option
                      key={activity.id}
                      value={activity.id}
                    >
                      {activity.activityCode} -{" "}
                      {activity.activityName}
                    </option>
                  ))}
              </select>
            </div>

            {errors.activityId && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.activityId.message}
              </p>
            )}

            {selectedActivity && (
              <div className="mt-2 text-xs text-slate-400">
                Fee per session:{" "}
                <span className="font-medium text-slate-600">
                  {formatCurrency(
                    Number(
                      selectedActivity.feePerSession ??
                        selectedActivity.sessionFee ??
                        selectedActivity.fee ??
                        0
                    )
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Enrollment Date */}

          <div className="relative z-30">
            <Controller
              name="enrollmentDate"
              control={control}
              render={({ field }) => (
                <NepaliDatePickerInput
                  label="Enrollment Date (BS)"
                  value={field.value ?? getCurrentBSDate()}
                  onChange={field.onChange}
                  error={errors.enrollmentDate?.message}
                  helperText="Date when student enrolled."
                />
              )}
            />
          </div>

          {/* Session Fee */}

          <div>
            <label
              htmlFor="sessionFee"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Session Fee (Rs.) <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                Rs.
              </span>

              <input
                id="sessionFee"
                type="number"
                min="0"
                step="0.01"
                {...register("sessionFee")}
                className={`h-11 w-full rounded-xl border bg-white pl-14 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:ring-2 ${
                  errors.sessionFee
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
                }`}
                placeholder="0.00"
              />
            </div>

            {errors.sessionFee && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.sessionFee.message}
              </p>
            )}

            <p className="mt-1.5 text-xs text-slate-400">
              Fee charged per attendance session for this student enrollment.
            </p>
          </div>

          {/* Notes */}

          <div className="lg:col-span-2">
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Notes
            </label>

            <div className="relative">
              <FileText
                size={17}
                className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
              />

              <textarea
                id="notes"
                {...register("notes")}
                rows={3}
                placeholder="Add any useful notes about this enrollment..."
                className="w-full resize-none rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          ENROLLMENT SUMMARY
      ======================================================= */}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Student Summary */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <User size={17} />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Student
              </p>

              <p className="mt-0.5 font-semibold text-slate-900">
                {selectedStudent?.fullName ?? "Not selected"}
              </p>
            </div>
          </div>

          {selectedStudent && (
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Code: {selectedStudent.studentCode}
            </div>
          )}
        </div>

        {/* Activity Summary */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <ActivityIcon size={17} />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Activity
              </p>

              <p className="mt-0.5 font-semibold text-slate-900">
                {selectedActivity?.activityName ?? "Not selected"}
              </p>
            </div>
          </div>

          {selectedActivity && (
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Category: {selectedActivity.category}
            </div>
          )}
        </div>

        {/* Session Fee Summary */}

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
              <BadgeDollarSign size={17} />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                Session Fee
              </p>

              <p className="mt-0.5 text-xl font-bold text-slate-900">
                {formatCurrency(Number(selectedSessionFee || 0))} / session
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          STATUS
      ======================================================= */}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                selectedStatus === "Active"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <CheckCircle2 size={19} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Enrollment Status
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Active enrollments are included in attendance.
              </p>
            </div>
          </div>

          <select
            {...register("status")}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50 sm:w-44"
          >
            <option value="Active">
              Active
            </option>

            <option value="Inactive">
              Inactive
            </option>
          </select>
        </div>
      </section>

      {/* ======================================================
          ACTION BAR
      ======================================================= */}

      <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate("/enrollments")}
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Saving..."
              : enrollmentId
              ? "Update Enrollment"
              : "Create Enrollment"}
          </button>
        </div>
      </div>
    </form>
  );
}