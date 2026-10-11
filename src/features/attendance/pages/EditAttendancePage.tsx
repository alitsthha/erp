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
} from "@/features/attendance/services/attendance.service";

import { getAllEnrollments } from "@/features/enrollments/services/enrollment.service";

import AttendanceForm from "@/features/attendance/forms/AttendanceForm";

export default function EditAttendancePage() {
  const { attendanceId } = useParams();
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const [attendanceData, enrollmentsData] = await Promise.all([
          getAttendanceById(attendanceId || ""),
          getAllEnrollments(),
        ]);

        setAttendance(attendanceData);
        setEnrollments(enrollmentsData);
      } catch (error) {
        console.error("Error loading attendance:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [attendanceId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={30} className="animate-spin" />
          <p className="text-sm">Loading attendance record...</p>
        </div>
      </div>
    );
  }

  if (!attendance) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4">
        <div className="ui-surface w-full p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ClipboardCheck size={22} />
          </div>

          <h1 className="ui-page-title mt-4">
            Attendance record not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            The attendance record may have been deleted or no longer exists.
          </p>

          <button
            type="button"
            onClick={() => navigate("/attendance")}
            className="ui-button mt-6 inline-flex items-center gap-2 bg-brand-600 py-3 text-white transition hover:bg-brand-700"
          >
            <ArrowLeft size={17} />
            Back to Attendance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate("/attendance")}
          className="ui-button mb-4 inline-flex items-center gap-2 border border-slate-300 bg-white py-2 text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          Back to Attendance
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <ClipboardCheck size={21} />
          </div>

          <div>
            <h1 className="ui-page-title">
              Attendance Roster for {attendance.sessionDateBS || attendance.sessionDate}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Editing record for{" "}
              <span className="font-medium text-slate-700">
                {attendance.studentName}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-1">
        <AttendanceForm
          enrollments={enrollments}
          initialData={attendance}
          onSuccess={() => navigate("/attendance")}
        />
      </div>
    </div>
  );
}