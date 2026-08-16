import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import { getAllEnrollments } from "@/features/enrollments/services/enrollment.service";

import AttendanceForm from "@/features/attendance/forms/AttendanceForm";

export default function AddAttendancePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryDate = searchParams.get("date") || "";
  const queryActivity = searchParams.get("activity") || "";

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Selected activity.
   *
   * Empty string means All Activities.
   */
  const [activityId, setActivityId] = useState(queryActivity);

  useEffect(() => {
    if (queryActivity) {
      setActivityId(queryActivity);
    }
  }, [queryActivity]);

  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        setIsLoading(true);

        const data = await getAllEnrollments();

        setEnrollments(data);
      } catch (error) {
        console.error(
          "Error loading enrollments:",
          error
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadEnrollments();
  }, []);

  /**
   * Create activity list from existing enrollments.
   *
   * We don't need another Firestore request here.
   *
   * One student can have multiple enrollments,
   * therefore activityId is used as the unique key.
   */
  const activities = useMemo(() => {
    const activityMap = new Map<
      string,
      {
        id: string;
        name: string;
        code: string;
      }
    >();

    enrollments.forEach((enrollment) => {
      const id = enrollment.activityId || "";

      if (!id) {
        return;
      }

      if (!activityMap.has(id)) {
        activityMap.set(id, {
          id,
          name:
            enrollment.activityName ||
            "Activity",
          code:
            enrollment.activityCode || "",
        });
      }
    });

    return Array.from(activityMap.values()).sort(
      (a, b) =>
        a.name.localeCompare(b.name)
    );
  }, [enrollments]);

  /**
   * Get selected activity name.
   */
  const selectedActivityName = useMemo(() => {
    if (!activityId) {
      return "All Activities";
    }

    return (
      activities.find(
        (activity) =>
          activity.id === activityId
      )?.name || "Activity"
    );
  }, [activityId, activities]);

  /**
   * Filter enrollments before sending them
   * to the AttendanceForm.
   *
   * This is important because AttendanceForm
   * will only load attendance for these students.
   */
  const filteredEnrollments = useMemo(() => {
    if (!activityId) {
      return enrollments;
    }

    return enrollments.filter(
      (enrollment) =>
        enrollment.activityId === activityId
    );
  }, [enrollments, activityId]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              navigate("/attendance")
            }
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={17} />

            Back to Attendance
          </button>

          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <ClipboardCheck size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Daily Attendance
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500 sm:text-base">
                Select an activity and attendance
                date, then mark students present or
                absent.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LOADING */}
      {isLoading ? (
        <div className="flex min-h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2
              size={28}
              className="animate-spin"
            />

            <p className="text-sm">
              Loading enrolled students...
            </p>
          </div>
        </div>
      ) : enrollments.length === 0 ? (
        /* NO ENROLLMENTS */
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
            <ClipboardCheck size={22} />
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            No enrollments available
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Create an enrollment before recording
            attendance.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/enrollments/add")
            }
            className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Add Enrollment
          </button>
        </div>
      ) : (
        /* ATTENDANCE FORM */
        <AttendanceForm
          enrollments={filteredEnrollments}
          attendanceDate={queryDate || undefined}
          activityId={activityId}
          activityName={selectedActivityName}
          activities={activities}
          onActivityChange={setActivityId}
          onSuccess={() =>
            navigate("/attendance")
          }
        />
      )}
    </div>
  );
}