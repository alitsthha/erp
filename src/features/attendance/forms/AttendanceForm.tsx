import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Save,
  Search,
  User,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { Attendance } from "@/features/attendance/types/attendance.types";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import { getAttendanceByDate, saveBatchAttendance } from "../services/attendance.service";

import { getCurrentBSDate } from "@/utils/nepali-date";
import BsDateSelect from "@/components/forms/BsDateSelect";

interface AttendanceFormProps {
  enrollments: Enrollment[];
  initialData?: Attendance;
  isLoading?: boolean;
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
  notes?: string;
}

export default function AttendanceForm({
  enrollments,
  initialData,
  isLoading = false,
  onSuccess,
}: AttendanceFormProps) {
  const navigate = useNavigate();

  const [sessionDate, setSessionDate] = useState<string>(
    initialData?.sessionDateBS || initialData?.sessionDate || getCurrentBSDate()
  );
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Active enrollments only
  const activeEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === "Active" || !e.status),
    [enrollments]
  );

  /* Load existing attendance records whenever sessionDate changes */
  useEffect(() => {
    async function loadAttendanceForDate() {
      setIsFetchingAttendance(true);
      try {
        const existingRecords = await getAttendanceByDate(sessionDate);
        const recordMap = new Map<string, Attendance>();
        existingRecords.forEach((rec) => {
          recordMap.set(rec.enrollmentId, rec);
        });

        const newRoster: RosterItem[] = activeEnrollments.map((enr) => {
          const existing = recordMap.get(enr.id || "");
          return {
            attendanceId: existing?.id,
            enrollmentId: enr.id || "",
            enrollmentCode: enr.enrollmentCode,
            studentId: enr.studentId,
            studentName: enr.studentName,
            studentCode: enr.studentCode,
            activityId: enr.activityId,
            activityName: enr.activityName,
            activityCode: enr.activityCode,
            status: existing?.status || "Present",
            sessionFee: existing?.sessionFee ?? enr.sessionFee ?? 0,
            notes: existing?.notes || "",
          };
        });

        setRoster(newRoster);
      } catch (err) {
        console.error("Error loading attendance for date:", err);
      } finally {
        setIsFetchingAttendance(false);
      }
    }

    void loadAttendanceForDate();
  }, [sessionDate, activeEnrollments]);

  const filteredRoster = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return roster;
    return roster.filter(
      (item) =>
        item.studentName.toLowerCase().includes(term) ||
        item.studentCode.toLowerCase().includes(term) ||
        item.activityName.toLowerCase().includes(term) ||
        item.activityCode.toLowerCase().includes(term)
    );
  }, [roster, searchTerm]);

  const presentCount = useMemo(
    () => roster.filter((r) => r.status === "Present").length,
    [roster]
  );

  const absentCount = useMemo(
    () => roster.filter((r) => r.status === "Absent").length,
    [roster]
  );

  const handleStatusToggle = (enrollmentId: string, newStatus: "Present" | "Absent") => {
    setRoster((prev) =>
      prev.map((item) =>
        item.enrollmentId === enrollmentId
          ? { ...item, status: newStatus }
          : item
      )
    );
  };

  const handleNotesChange = (enrollmentId: string, notes: string) => {
    setRoster((prev) =>
      prev.map((item) =>
        item.enrollmentId === enrollmentId ? { ...item, notes } : item
      )
    );
  };

  const handleMarkAll = (status: "Present" | "Absent") => {
    setRoster((prev) => prev.map((item) => ({ ...item, status })));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roster.length === 0) return;

    setIsSaving(true);
    setSaveSuccess(null);

    try {
      const recordsToSave = roster.map((item) => ({
        id: item.attendanceId,
        enrollmentId: item.enrollmentId,
        enrollmentCode: item.enrollmentCode,
        studentId: item.studentId,
        studentName: item.studentName,
        studentCode: item.studentCode,
        activityId: item.activityId,
        activityName: item.activityName,
        activityCode: item.activityCode,
        sessionDate: sessionDate,
        sessionDateBS: sessionDate,
        status: item.status,
        sessionFee: item.sessionFee,
        notes: item.notes || "",
      }));

      await saveBatchAttendance(recordsToSave);

      setSaveSuccess(`Attendance for ${sessionDate} saved successfully!`);
      setTimeout(() => setSaveSuccess(null), 4000);

      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/attendance");
      }
    } catch (err) {
      console.error("Error saving attendance batch:", err);
      alert("Failed to save attendance records.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {saveSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 shadow-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium">{saveSuccess}</p>
        </div>
      )}

      {/* DATE SELECTOR & STATS HEADER */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <CalendarDays size={20} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Select Attendance Date
                </h2>
                <p className="text-xs text-slate-500">
                  Attendance will load all students enrolled in activities for this date.
                </p>
              </div>
            </div>

            <div className="w-full sm:w-64">
              <BsDateSelect
                label=""
                value={sessionDate}
                onChange={setSessionDate}
                disabled={isSaving || isLoading}
              />
            </div>
          </div>
        </div>

        {/* SUMMARY STATS BAR */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/70 p-4">
          <div className="px-4 text-center sm:text-left">
            <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Total Enrolled
            </span>
            <span className="mt-0.5 block text-xl font-bold text-slate-900">
              {roster.length}
            </span>
          </div>

          <div className="px-4 text-center sm:text-left">
            <span className="block text-xs font-medium uppercase tracking-wider text-emerald-600">
              Present
            </span>
            <span className="mt-0.5 block text-xl font-bold text-emerald-600">
              {presentCount}
            </span>
          </div>

          <div className="px-4 text-center sm:text-left">
            <span className="block text-xs font-medium uppercase tracking-wider text-red-600">
              Absent
            </span>
            <span className="mt-0.5 block text-xl font-bold text-red-600">
              {absentCount}
            </span>
          </div>
        </div>
      </section>

      {/* ROSTER TABLE & SEARCH */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search student or activity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleMarkAll("Present")}
              disabled={isSaving || isFetchingAttendance || roster.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              <UserCheck size={14} />
              Mark All Present
            </button>

            <button
              type="button"
              onClick={() => handleMarkAll("Absent")}
              disabled={isSaving || isFetchingAttendance || roster.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              <UserX size={14} />
              Mark All Absent
            </button>
          </div>
        </div>

        {/* ROSTER CONTENT */}
        {isFetchingAttendance ? (
          <div className="flex min-h-48 items-center justify-center p-8">
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              <span className="text-sm">Loading enrolled students for {sessionDate}...</span>
            </div>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <User className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-medium">No enrolled students found</p>
            <p className="text-xs text-slate-400">
              Ensure students are enrolled in active activities.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Student
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Enrolled Activity
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Session Fee
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Attendance Status
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.map((item) => (
                  <tr key={item.enrollmentId} className="transition hover:bg-slate-50/70">
                    {/* Student */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {item.studentName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.studentCode || "-"}
                      </div>
                    </td>

                    {/* Activity */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">
                        {item.activityName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.activityCode || "-"}
                      </div>
                    </td>

                    {/* Session Fee */}
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                      Rs. {item.sessionFee.toLocaleString()}
                    </td>

                    {/* Status Toggles */}
                    <td className="px-5 py-4">
                      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(item.enrollmentId, "Present")}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            item.status === "Present"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <BadgeCheck size={14} />
                          Present
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusToggle(item.enrollmentId, "Absent")}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            item.status === "Absent"
                              ? "bg-red-600 text-white shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <XCircle size={14} />
                          Absent
                        </button>
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="px-5 py-4">
                      <input
                        type="text"
                        placeholder="Add note..."
                        value={item.notes || ""}
                        onChange={(e) => handleNotesChange(item.enrollmentId, e.target.value)}
                        className="h-9 w-full min-w-36 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ACTION BAR */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => navigate("/attendance")}
          disabled={isSaving}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSaving || roster.length === 0}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
        >
          {isSaving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving Attendance...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Attendance for {sessionDate}
            </>
          )}
        </button>
      </div>
    </form>
  );
}