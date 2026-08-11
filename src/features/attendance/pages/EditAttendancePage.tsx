import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import type { Attendance } from "@/features/attendance/types/attendance.types";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";

import {
  getAttendanceById,
  updateAttendance,
} from "@/features/attendance/services/attendance.service";

import { getAllEnrollments } from "@/features/enrollments/services/enrollment.service";

import type { AttendanceFormData } from "@/features/attendance/schemas/attendance.schema";

import AttendanceForm from "@/features/attendance/forms/AttendanceForm";

export default function EditAttendancePage() {
  const { attendanceId } = useParams();
  const navigate = useNavigate();

  const [attendance, setAttendance] =
    useState<Attendance | null>(null);

  const [enrollments, setEnrollments] =
    useState<Enrollment[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const [
          attendanceData,
          enrollmentsData,
        ] = await Promise.all([
          getAttendanceById(attendanceId || ""),
          getAllEnrollments(),
        ]);

        setAttendance(attendanceData);
        setEnrollments(enrollmentsData);
      } catch (error) {
        console.error(
          "Error loading attendance:",
          error
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [attendanceId]);

  const handleSubmit = async (
    data: AttendanceFormData
  ) => {
    if (!attendanceId) return;

    try {
      setIsSaving(true);

      await updateAttendance(
        attendanceId,
        {
          sessionDate: data.sessionDate,
          sessionDateBS: data.sessionDate,
          status: data.status,
          sessionFee: data.sessionFee,
          notes: data.notes,
        }
      );

      navigate("/attendance");
    } catch (error) {
      console.error(
        "Error updating attendance:",
        error
      );

      alert(
        "Failed to update attendance record."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2
            size={30}
            className="animate-spin"
          />

          <p className="text-sm">
            Loading attendance record...
          </p>
        </div>
      </div>
    );
  }

  if (!attendance) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ClipboardCheck size={22} />
          </div>

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Attendance record not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            The attendance record may have been
            deleted or no longer exists.
          </p>

          <button
            type="button"
            onClick={() => navigate("/attendance")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <ArrowLeft size={17} />
            Back to Attendance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

      {/* Header */}
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
              Edit Attendance
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Update attendance information for{" "}
              <span className="font-medium text-slate-700">
                {attendance.studentName}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-8">
          <h2 className="text-base font-semibold text-slate-900">
            Attendance Details
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Update the session date, status, fee, or notes.
          </p>
        </div>

        <div className="p-5 sm:p-8">
          <AttendanceForm
            enrollments={enrollments}
            initialData={attendance}
            onSubmit={handleSubmit}
            isLoading={isSaving}
          />
        </div>
      </div>
    </div>
  );
}