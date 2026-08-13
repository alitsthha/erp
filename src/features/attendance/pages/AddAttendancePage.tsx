import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import { getAllEnrollments } from "@/features/enrollments/services/enrollment.service";
import AttendanceForm from "@/features/attendance/forms/AttendanceForm";

export default function AddAttendancePage() {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
                Daily Attendance Roster
              </h1>

              <p className="mt-1 text-sm text-slate-500 sm:text-base">
                Record attendance by date for all enrolled students in active activities.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="p-1">
        {isLoading ? (
          <div className="flex min-h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">Loading enrolled students...</p>
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
            onSuccess={() => navigate("/attendance")}
          />
        )}
      </div>
    </div>
  );
}