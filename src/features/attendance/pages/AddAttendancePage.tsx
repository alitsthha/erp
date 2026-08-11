import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import { getAllEnrollments } from "@/features/enrollments/services/enrollment.service";
import { createAttendance } from "@/features/attendance/services/attendance.service";
import type { AttendanceFormData } from "@/features/attendance/schemas/attendance.schema";
import AttendanceForm from "@/features/attendance/forms/AttendanceForm";

export default function AddAttendancePage() {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        setIsLoading(true);

        const data = await getAllEnrollments();

        setEnrollments(data);
      } catch (error) {
        console.error("Error loading enrollments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEnrollments();
  }, []);

  const handleSubmit = async (
    data: AttendanceFormData & {
      enrollmentId?: string;
      sessionDate?: string;
    }
  ) => {
    try {
      setIsSaving(true);

      const enrollment = enrollments.find(
        (item) => item.id === data.enrollmentId
      );

      if (!enrollment) {
        throw new Error("Enrollment not found");
      }

      const bsDate = data.sessionDate || "";

      await createAttendance({
        enrollmentId: data.enrollmentId || "",
        enrollmentCode: enrollment.enrollmentCode,
        studentId: enrollment.studentId,
        studentName: enrollment.studentName,
        studentCode: enrollment.studentCode,
        activityId: enrollment.activityId,
        activityName: enrollment.activityName,
        activityCode: enrollment.activityCode,
        sessionDate: bsDate,
        sessionDateBS: bsDate,
        status: data.status,
        sessionFee: data.sessionFee,
        notes: data.notes,
      });

      navigate("/attendance");
    } catch (error) {
      console.error("Error creating attendance:", error);
      alert("Failed to create attendance record.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/attendance")}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            Back to Attendance
          </button>

          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ClipboardCheck size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Add Attendance
              </h1>

              <p className="mt-1 text-sm text-slate-500 sm:text-base">
                Record student attendance for an activity session.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-8">
          <h2 className="text-base font-semibold text-slate-900">
            Attendance Details
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select the enrollment, attendance date, and session status.
          </p>
        </div>

        <div className="p-5 sm:p-8">
          {isLoading ? (
            <div className="flex min-h-60 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2
                  size={28}
                  className="animate-spin"
                />

                <p className="text-sm">
                  Loading enrollments...
                </p>
              </div>
            </div>
          ) : enrollments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <h3 className="font-semibold text-slate-900">
                No enrollments available
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create an enrollment before recording attendance.
              </p>

              <button
                type="button"
                onClick={() => navigate("/enrollments/add")}
                className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Add Enrollment
              </button>
            </div>
          ) : (
            <AttendanceForm
              enrollments={enrollments}
              onSubmit={handleSubmit}
              isLoading={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}