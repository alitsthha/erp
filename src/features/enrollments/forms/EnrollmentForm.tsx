import toast from "react-hot-toast";
import SafeForm from "@/components/forms/SafeForm";
import SearchableSelect from "@/components/forms/SearchableSelect";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  DuplicateEnrollmentError,
  getActivitiesForEnrollment,
  getStudentsForEnrollment,
  getEnrollmentById,
  updateEnrollment,
} from "../services/enrollment.service";

import type { Activity } from "@/features/activities/types/activity.types";
import type { Student } from "@/features/students/types/student.types";
import type { Enrollment } from "../types/enrollment.types";
import ConfirmDialog from "@/components/common/ConfirmDialog";

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
  const [searchParams] = useSearchParams();
  const initialStudentId = searchParams.get("studentId") ?? "";

  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [duplicateEnrollment, setDuplicateEnrollment] = useState<Enrollment | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty, errors, isSubmitting },
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema) as any,

    defaultValues: {
      studentId: initialStudentId,
      activityId: "",
      enrollmentDate: getCurrentBSDate(),
      sessionFee: "",
      monthlyFee: "",
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

    if (selectedActivity.countedMonthly) {
      setValue(
        "monthlyFee",
        String(selectedActivity.feePerMonth ?? selectedActivity.fee ?? 0)
      );
      setValue("sessionFee", "0");
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
    setValue("monthlyFee", "0");
  }, [selectedActivity, setValue]);

  /*
  ============================================================
  LOAD EXISTING ENROLLMENT
  ============================================================
  */

  useEffect(() => {
    if (!enrollmentId) {
      reset({
        studentId: initialStudentId,
        activityId: "",
        enrollmentDate: getCurrentBSDate(),
        sessionFee: "",
        monthlyFee: "",
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
          monthlyFee:
            enrollment.monthlyFee !== undefined
              ? String(enrollment.monthlyFee)
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
  }, [enrollmentId, reset, navigate, initialStudentId]);

  /*
  ============================================================
  SUBMIT
  ============================================================
  */

  const onSubmit = async (data: EnrollmentFormData) => {
    try {
      if (enrollmentId) {
        await updateEnrollment(enrollmentId, data);
        toast.success("Enrollment updated successfully.");
      } else {
        await addEnrollment(data);
        toast.success("Enrollment created successfully.");
      }

      reset({
        studentId: initialStudentId,
        activityId: "",
        enrollmentDate: getCurrentBSDate(),
        sessionFee: "",
        monthlyFee: "",
        notes: "",
        status: "Active",
      });

      navigate("/enrollments");
    } catch (error) {
      console.error(error);
      if (error instanceof DuplicateEnrollmentError) {
        setDuplicateEnrollment(error.enrollment);
        return;
      }
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
      <div className="ui-surface p-10 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />

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
    <SafeForm dirty={isDirty}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      {/* ======================================================
          MAIN INFORMATION
      ======================================================= */}

      <section className="ui-surface relative overflow-visible">
        {/* Section Header */}

        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ClipboardList size={19} />
            </div>

            <div>
              <h2 className="ui-section-title">
                Enrollment Details
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Select a student, activity, enrollment date, and session fee.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}

        <div className="grid grid-cols-1 gap-6 p-4 sm:p-5 lg:grid-cols-2">
          {/* Student */}

          <div>
            <label
              htmlFor="studentId"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Student <span className="text-red-500">*</span>
            </label>

            <Controller
              name="studentId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  id="studentId"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  aria-required="true"
                  aria-invalid={!!errors.studentId}
                  aria-describedby={errors.studentId ? "studentId-error" : undefined}
                  placeholder="Type a student name or unique code"
                  emptyMessage="No students found. Try another name or code."
                >
                  <option value="">Select student</option>
                  {students.map((student) => <option key={student.id} value={student.id}>{student.studentCode} - {student.fullName}</option>)}
                </SearchableSelect>
              )}
            />

            {errors.studentId && (
              <p id="studentId-error" className="mt-1.5 text-xs font-medium text-red-500">
                {errors.studentId.message}
              </p>
            )}

            {selectedStudent && (
              <div className="mt-2 text-xs text-slate-400">
                Selected:{" "}
                <span className="font-medium text-slate-600">
                  {selectedStudent.studentCode} - {selectedStudent.fullName}
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
                className="ui-field-icon text-slate-400"
              />

              <SearchableSelect value={watch("activityId")}
                id="activityId"
                {...register("activityId")}
                className={`h-11 w-full appearance-none rounded-xl border bg-white ui-field-leading pr-4 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                  errors.activityId
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-brand-600 focus:ring-brand-50"
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
              </SearchableSelect>
            </div>

            {errors.activityId && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.activityId.message}
              </p>
            )}

            {selectedActivity && (
              <div className="mt-2 text-xs text-slate-400">
                {selectedActivity.countedMonthly ? "Fee per month: " : "Fee per session: "}
                <span className="font-medium text-slate-600">
                  {formatCurrency(
                    Number(
                      selectedActivity.countedMonthly
                        ? (selectedActivity.feePerMonth ?? 0)
                        : (selectedActivity.feePerSession ?? selectedActivity.sessionFee ?? selectedActivity.fee ?? 0)
                    )
                  )} {selectedActivity.countedMonthly ? "/ month" : "/ session"}
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

          {/* Activity Fee */}

          <div>
            <label
              htmlFor={selectedActivity?.countedMonthly ? "monthlyFee" : "sessionFee"}
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              {selectedActivity?.countedMonthly ? "Monthly Fee (Rs.)" : "Session Fee (Rs.)"} <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <span className="ui-field-icon text-sm font-semibold text-slate-500">
                Rs.
              </span>

              <input
                id={selectedActivity?.countedMonthly ? "monthlyFee" : "sessionFee"}
                type="number"
                min="0"
                step="0.01"
                {...register(selectedActivity?.countedMonthly ? "monthlyFee" : "sessionFee")}
                className={`ui-field w-full bg-white ui-field-prefix pr-4 text-sm font-medium text-slate-900 outline-none transition focus:ring-2 ${
                  errors.sessionFee
                    ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                    : "border-slate-300 focus:border-brand-600 focus:ring-brand-50"
                }`}
                placeholder={selectedActivity?.countedMonthly ? "Monthly amount" : "Session amount"}
              />
            </div>

            {errors.sessionFee && !selectedActivity?.countedMonthly && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.sessionFee.message}
              </p>
            )}

            {!selectedActivity?.countedMonthly && (
              <p className="mt-1.5 text-xs text-slate-400">
                Fee charged for each attended session.
              </p>
            )}
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
                className="ui-field-icon ui-field-icon-multiline text-slate-400"
              />

              <textarea
                id="notes"
                {...register("notes")}
                rows={3}
                placeholder="Add any useful notes about this enrollment..."
                className="ui-field w-full resize-none ui-field-leading pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-50"
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

        <div className="ui-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
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

        <div className="ui-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
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

        <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
              <BadgeDollarSign size={17} />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                {selectedActivity?.countedMonthly ? "Fee per Month" : "Session Fee"}
              </p>

              <p className="mt-0.5 text-xl font-bold text-slate-900">
                {formatCurrency(Number(selectedActivity?.countedMonthly ? (selectedActivity?.feePerMonth ?? 0) : (selectedSessionFee || 0)))} {selectedActivity?.countedMonthly ? "/ month" : "/ session"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          STATUS
      ======================================================= */}

      <section className="ui-surface">
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
              <h2 className="ui-section-title text-sm">
                Enrollment Status
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Active enrollments continue every month until revoked. Inactive (revoked) enrollments are excluded from new attendance; existing history is kept.
              </p>
            </div>
          </div>

          <SearchableSelect value={watch("status")}
            {...register("status")}
            className="ui-field w-full px-4 font-medium text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-50 sm:w-44"
          >
            <option value="Active">
              Active
            </option>

            <option value="Inactive">
              Inactive (revoked)
            </option>
          </SearchableSelect>
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
            className="ui-button inline-flex items-center justify-center border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="ui-button inline-flex items-center justify-center bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Saving..."
              : enrollmentId
              ? "Update Enrollment"
              : "Create Enrollment"}
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(duplicateEnrollment)}
        title="Student already enrolled"
        isDestructive={false}
        confirmLabel="Open Existing Enrollment"
        description={<>
          <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
            <strong>{duplicateEnrollment?.studentName || selectedStudent?.fullName}</strong>
            {duplicateEnrollment?.status === "Inactive" ? " already has an inactive enrollment in " : " is currently enrolled in "}
            <strong>{duplicateEnrollment?.activityName || selectedActivity?.activityName}</strong>.
          </p>
          <p className="mt-3">A duplicate enrollment will not be created. Open the existing enrollment to review or update it?</p>
        </>}
        onCancel={() => setDuplicateEnrollment(null)}
        onConfirm={() => {
          const existingId = duplicateEnrollment?.id;
          setDuplicateEnrollment(null);
          if (existingId) navigate(`/enrollments/edit/${existingId}`);
        }}
      />
    </SafeForm>
  );
}
