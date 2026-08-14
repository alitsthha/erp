import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Save,
  Search,
  UserCheck,
  UserX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import type {
  Attendance,
  BillingStatus,
} from "@/features/attendance/types/attendance.types";

import type { Enrollment } from "@/features/enrollments/types/enrollment.types";

import {
  getAttendanceByDate,
  saveBatchAttendance,
} from "../services/attendance.service";

import { getCurrentBSDate } from "@/utils/nepali-date";
import BsDateSelect from "@/components/forms/BsDateSelect";

interface ActivityOption {
  id: string;
  name: string;
  code: string;
}

interface AttendanceFormProps {
  enrollments: Enrollment[];

  initialData?: Attendance;

  isLoading?: boolean;

  attendanceDate?: string;

  activityId?: string;

  activityName?: string;

  activities?: ActivityOption[];

  onActivityChange?: (activityId: string) => void;

  onSuccess?: () => void;
}

interface RosterItem {
  attendanceId?: string;

  enrollmentId: string;
  enrollmentCode: string;

  studentId: string;
  studentName: string;
  studentCode: string;

  activityId: string;
  activityName: string;
  activityCode: string;

  status: "Present" | "Absent";

  sessionFee: number;

  dueAmount: number;

  notes?: string;
}

export default function AttendanceForm({
  enrollments,
  initialData,
  isLoading = false,
  attendanceDate,
  activityId = "",
  activityName = "All Activities",
  activities = [],
  onActivityChange,
  onSuccess,
}: AttendanceFormProps) {
  const navigate = useNavigate();

  const [sessionDate, setSessionDate] = useState<string>(
    attendanceDate ||
      initialData?.sessionDateBS ||
      initialData?.sessionDate ||
      getCurrentBSDate()
  );

  const [roster, setRoster] = useState<RosterItem[]>([]);

  const [isFetchingAttendance, setIsFetchingAttendance] =
    useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const hasActivityFilter = Boolean(activityId);

  const isDateBeforeOrOn = (left: string, right: string) => {
    if (!left || !right) {
      return true;
    }

    return left <= right;
  };

  /*
   * Keep date synchronized with parent.
   */
  useEffect(() => {
    if (attendanceDate) {
      setSessionDate(attendanceDate);
    }
  }, [attendanceDate]);

  /*
   * Active enrollments.
   */
  const activeEnrollments = useMemo(() => {
    return enrollments.filter((enrollment) => {
      const isActive =
        enrollment.status === "Active" ||
        !enrollment.status;

      if (!isActive) {
        return false;
      }

      if (activityId && enrollment.activityId !== activityId) {
        return false;
      }

      if (!sessionDate) {
        return true;
      }

      const enrollmentDate =
        typeof enrollment.enrollmentDate === "string"
          ? enrollment.enrollmentDate.trim()
          : "";

      if (!enrollmentDate) {
        return true;
      }

      const normalizedEnrollmentDate = enrollmentDate.includes("-")
        ? enrollmentDate.slice(0, 10)
        : enrollmentDate;

      return isDateBeforeOrOn(
        normalizedEnrollmentDate,
        sessionDate
      );
    });
  }, [enrollments, activityId, sessionDate]);

  /*
   * Load attendance for selected date.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadAttendanceForDate() {
      if (
        !sessionDate ||
        activeEnrollments.length === 0
      ) {
        setRoster([]);
        return;
      }

      setIsFetchingAttendance(true);

      try {
        const existingRecords =
          await getAttendanceByDate(sessionDate);

        if (cancelled) {
          return;
        }

        const recordMap =
          new Map<string, Attendance>();

        existingRecords.forEach((record) => {
          /*
           * If an activity is selected, only use
           * records belonging to that activity.
           */
          if (
            activityId &&
            record.activityId !== activityId
          ) {
            return;
          }

          recordMap.set(
            record.enrollmentId,
            record
          );
        });

        const newRoster: RosterItem[] =
          activeEnrollments.map((enrollment) => {
            const enrollmentId =
              enrollment.id ?? "";

            const existing =
              recordMap.get(enrollmentId);

            const sessionFee =
              Number(
                existing?.sessionFee ??
                  enrollment.sessionFee ??
                  0
              ) || 0;

            const dueAmount =
              existing?.status === "Absent"
                ? 0
                : Number(
                    existing?.dueAmount ??
                      sessionFee
                  ) || 0;

            return {
              attendanceId:
                existing?.id,

              enrollmentId,

              enrollmentCode:
                enrollment.enrollmentCode ?? "",

              studentId:
                enrollment.studentId ?? "",

              studentName:
                enrollment.studentName ??
                "Student",

              studentCode:
                enrollment.studentCode ?? "",

              activityId:
                enrollment.activityId ?? "",

              activityName:
                enrollment.activityName ??
                "Activity",

              activityCode:
                enrollment.activityCode ?? "",

              status:
                existing?.status ??
                "Present",

              sessionFee,

              dueAmount,

              notes:
                existing?.notes ?? "",
            };
          });

        setRoster(newRoster);
      } catch (error) {
        console.error(
          "Error loading attendance:",
          error
        );

        if (!cancelled) {
          setRoster([]);
        }
      } finally {
        if (!cancelled) {
          setIsFetchingAttendance(false);
        }
      }
    }

    void loadAttendanceForDate();

    return () => {
      cancelled = true;
    };
  }, [
    sessionDate,
    activeEnrollments,
    activityId,
  ]);

  /*
   * Search.
   */
  const filteredRoster = useMemo(() => {
    const term =
      searchTerm.trim().toLowerCase();

    if (!term) {
      return roster;
    }

    return roster.filter((item) => {
      return (
        item.studentName
          .toLowerCase()
          .includes(term) ||
        item.studentCode
          .toLowerCase()
          .includes(term) ||
        item.activityName
          .toLowerCase()
          .includes(term) ||
        item.activityCode
          .toLowerCase()
          .includes(term)
      );
    });
  }, [roster, searchTerm]);

  /*
   * Statistics.
   */
  const presentCount = useMemo(() => {
    return roster.filter(
      (item) => item.status === "Present"
    ).length;
  }, [roster]);

  const absentCount = useMemo(() => {
    return roster.filter(
      (item) => item.status === "Absent"
    ).length;
  }, [roster]);

  /*
   * Toggle status.
   */
  const handleStatusToggle = (
    enrollmentId: string,
    status: "Present" | "Absent"
  ) => {
    setRoster((previous) =>
      previous.map((item) => {
        if (
          item.enrollmentId !==
          enrollmentId
        ) {
          return item;
        }

        return {
          ...item,
          status,

          dueAmount:
            status === "Present"
              ? Number(item.sessionFee) || 0
              : 0,
        };
      })
    );
  };

  /*
   * Notes.
   */
  const handleNotesChange = (
    enrollmentId: string,
    notes: string
  ) => {
    setRoster((previous) =>
      previous.map((item) =>
        item.enrollmentId === enrollmentId
          ? {
              ...item,
              notes,
            }
          : item
      )
    );
  };

  /*
   * Mark all.
   */
  const handleMarkAll = (
    status: "Present" | "Absent"
  ) => {
    setRoster((previous) =>
      previous.map((item) => ({
        ...item,

        status,

        dueAmount:
          status === "Present"
            ? Number(item.sessionFee) || 0
            : 0,
      }))
    );
  };

  const handleClearAttendance = () => {
    setRoster((previous) =>
      previous.map((item) => ({
        ...item,
        status: "Absent",
        dueAmount: 0,
        notes: "",
      }))
    );
  };

  /*
   * Save.
   */
  const handleSave = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      roster.length === 0 ||
      isSaving
    ) {
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);

    try {
      const recordsToSave =
        roster.map((item) => {
          const isPresent =
            item.status === "Present";

          const chargeAmount =
            isPresent
              ? Number(item.sessionFee) || 0
              : 0;

          /*
           * IMPORTANT:
           *
           * Explicitly type this as BillingStatus.
           * This fixes TS2345.
           */
          const billingStatus: BillingStatus =
            chargeAmount > 0
              ? "Due"
              : "No Charge";

          return {
            id: item.attendanceId,

            enrollmentId:
              item.enrollmentId,

            enrollmentCode:
              item.enrollmentCode,

            studentId:
              item.studentId,

            studentName:
              item.studentName,

            studentCode:
              item.studentCode,

            activityId:
              item.activityId,

            activityName:
              item.activityName,

            activityCode:
              item.activityCode,

            sessionDate:
              sessionDate,

            sessionDateBS:
              sessionDate,

            status:
              item.status,

            sessionFee:
              Number(item.sessionFee) || 0,

            chargeAmount,

            dueAmount:
              chargeAmount,

            billingStatus,

            notes:
              item.notes ?? "",
          };
        });

      await saveBatchAttendance(
        recordsToSave
      );

      setSaveSuccess(
        `Attendance for ${sessionDate} saved successfully.`
      );

      window.setTimeout(() => {
        setSaveSuccess(null);
      }, 3000);

      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/attendance");
      }
    } catch (error) {
      console.error(
        "Error saving attendance:",
        error
      );

      alert(
        "Failed to save attendance. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  /*
   * JSX below this point can remain the same
   * as your current JSX.
   */

  return (
    <form
      onSubmit={handleSave}
      className="w-full space-y-6"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Attendance roster
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {activityName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Mark each enrolled student as present or absent to generate session fee automatically.
            </p>
          </div>

          <div className="w-full max-w-md">
            <BsDateSelect
              label="Session Date"
              value={sessionDate}
              onChange={setSessionDate}
              helperText="Attendance date in BS format"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <label htmlFor="attendance-activity" className="mb-2 block text-sm font-medium text-slate-700">
              Filter by activity
            </label>
            <select
              id="attendance-activity"
              value={activityId}
              onChange={(event) => onActivityChange?.(event.target.value)}
              disabled={isLoading || activities.length === 0}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">All activities</option>
              {activities.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {isLoading ? "Loading..." : hasActivityFilter ? "Filtered view" : "All enrollments"}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search student, code, or activity"
              className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleMarkAll("Present")}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              <UserCheck size={16} />
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll("Absent")}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
            >
              <UserX size={16} />
              Mark All Absent
            </button>
            <button
              type="button"
              onClick={handleClearAttendance}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear Attendance
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Present</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{presentCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Absent</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{absentCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{roster.length}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isFetchingAttendance ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
            <CalendarDays className="h-4 w-4 animate-pulse" />
            Loading attendance for this date...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Student</th>
                  <th className="px-5 py-4 font-semibold">Activity</th>
                  <th className="px-5 py-4 font-semibold">Session fee</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                      No students found for this selection.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map((item) => (
                    <tr key={item.enrollmentId} className="hover:bg-slate-50">
                      <td className="px-5 py-4 align-top">
                        <div className="font-semibold text-slate-900">{item.studentName}</div>
                        <div className="mt-1 text-xs text-slate-400">{item.studentCode}</div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="font-medium text-slate-700">{item.activityName}</div>
                        <div className="mt-1 text-xs text-slate-400">{item.activityCode}</div>
                      </td>

                      <td className="px-5 py-4 align-top text-sm text-slate-700">
                        Rs. {Number(item.sessionFee || 0).toLocaleString("en-IN")}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(item.enrollmentId, "Present")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                              item.status === "Present"
                                ? "bg-emerald-600 text-white"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <CheckCircle2 size={14} />
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(item.enrollmentId, "Absent")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                              item.status === "Absent"
                                ? "bg-rose-600 text-white"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <UserX size={14} />
                            Absent
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <input
                          type="text"
                          value={item.notes ?? ""}
                          onChange={(event) => handleNotesChange(item.enrollmentId, event.target.value)}
                          placeholder="Add note"
                          className="h-10 w-full min-w-[180px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">
          {saveSuccess ? (
            <span className="font-medium text-emerald-600">{saveSuccess}</span>
          ) : (
            <span>Present students will be billed automatically from session fee.</span>
          )}
        </div>

        <button
          type="submit"
          disabled={roster.length === 0 || isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeLinecap="round" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Attendance
            </>
          )}
        </button>
      </div>
    </form>
  );
}