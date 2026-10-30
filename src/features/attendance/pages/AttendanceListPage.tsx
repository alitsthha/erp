import { useRememberedSearchParams } from "@/hooks/useRememberedSearchParams";
import { useSessionState } from "@/hooks/useSessionState";
import { attendanceSelectionRecords } from "../utils/attendance-selection";
import "../attendance.css";
import ListSortControl from "@/components/common/ListSortControl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  Users,
  XCircle,
  Sparkles,
  Edit3,
  UserRound,
  ListFilter,
  Send,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { filterActivityRecords, readAttendanceFilters } from "../utils/attendance-navigation";
import { useKathmanduToday } from "@/hooks/useKathmanduToday";
import BSMonthNavigator from "@/components/common/BSMonthNavigator";

import type {
  Attendance,
  DailyAttendanceRecord,
  AttendanceListRow,
} from "@/features/attendance/types/attendance.types";

import {
  fetchAttendances,
  fetchDailyAttendance,
  fetchAttendanceDatesBS,
} from "@/features/attendance/services/attendance-list.service";

import { deleteAttendanceRecords } from "@/features/attendance/services/attendance.service";

import { formatBSDate } from "@/utils/nepali-date";

import AttendanceDateNavigator from "@/features/attendance/components/AttendanceDateNavigator";
import AttendanceSearch from "@/features/attendance/components/AttendanceSearch";
import AttendanceFilters from "@/features/attendance/components/AttendanceFilters";
import AttendanceTable from "@/features/attendance/components/AttendanceTable";
import AttendanceReminder from "@/features/attendance/components/AttendanceReminder";
import { attendanceInBSMonth, getAttendedClasses } from "../utils/attendance-tracking";

import { useAuth } from "@/app/providers/AuthProvider";
import { isActivityAllowedForRole, isTeacherRole } from "@/lib/rbac";
import { getStudentById } from "@/features/students/services/student.service";
import { queueEmail } from "@/features/finance/services/email.service";
import { subscribeActivityColors } from "@/features/activities/services/activity-color.service";
import type { ActivityColors } from "@/features/activities/utils/activity-color";
import { getAttendanceTeachers } from "../utils/attendance-recorder";

type FilterStatus = "All" | "Present" | "Absent";
type ViewMode = "daily" | "all";
type GroupedAttendanceRow = AttendanceListRow;

export default function AttendanceListPage() {
  const navigate = useNavigate();
  const { role, activityIds, isAdmin } = useAuth();

  // Current BS Date by default
  const todayBS = useKathmanduToday();
  const [searchParams, setSearchParams] = useRememberedSearchParams("attendance");
  const { date: selectedDateBS, activityId: selectedActivityId, view: viewMode } = readAttendanceFilters(searchParams, todayBS);
  const updateRouteFilter = (key: string, value: string) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    next.set(key, value);
    if (key === "activityId") next.delete("activity");
    return next;
  });
  const setSelectedDateBS = (value: string) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    if (value === todayBS) next.delete("date");
    else next.set("date", value);
    return next;
  });
  const selectedMonth = selectedDateBS.slice(0, 7);
  const setSelectedActivityId = (value: string) => updateRouteFilter("activityId", value);
  const setViewMode = (value: ViewMode) => updateRouteFilter("view", value);

  // Daily records and all records
  const [dailyData, setDailyData] = useState<DailyAttendanceRecord | null>(null);
  const [allAttendances, setAllAttendances] = useState<Attendance[]>([]);
  const [recordedDates, setRecordedDates] = useState<string[]>([]);

  // Filters & State
  const [searchTerm, setSearchTerm] = useSessionState("attendance:searchTerm", "");
  const [filterStatus, setFilterStatus] = useSessionState<FilterStatus>("attendance:status", "All");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const deletionInProgress = useRef(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const selectionScope = JSON.stringify([selectedDateBS, viewMode, selectedActivityId, searchTerm, filterStatus, role, activityIds]);
  const [selection, setSelection] = useState<{ scope: string; ids: string[] }>({ scope: selectionScope, ids: [] });
  if (selection.scope !== selectionScope) setSelection({ scope: selectionScope, ids: [] });
  const [activityColors, setActivityColors] = useState<ActivityColors>({});

  useEffect(() => subscribeActivityColors(setActivityColors, () => setActivityColors({})), []);


  // Load recorded dates list on mount
  useEffect(() => {
    const loadDates = async () => {
      try {
        const dates = await fetchAttendanceDatesBS();
        setRecordedDates(dates);
      } catch (error) {
        console.error("Error loading attendance dates:", error);
      }
    };
    void loadDates();
  }, []);

  // Load data when selected date or view mode changes
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setLoadError(false);
      try {
        if (viewMode === "daily") {
          const [data, history] = await Promise.all([
            fetchDailyAttendance(selectedDateBS),
            fetchAttendances(),
          ]);
          if (!cancelled) {
            setDailyData(data);
            setAllAttendances(history);
          }
        } else {
          const data = await fetchAttendances();
          if (!cancelled) {
            setAllAttendances(data);
          }
        }
      } catch (error) {
        console.error("Error loading attendance:", error);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [selectedDateBS, viewMode, todayBS, refreshVersion]);

  // Determine active raw records list based on view mode and role access
  const activeRecords: Attendance[] = useMemo(() => {
    const raw = viewMode === "daily" ? dailyData?.attendances || [] : attendanceInBSMonth(allAttendances, selectedMonth);
    return raw.filter((item) =>
      isActivityAllowedForRole(role, item.activityName, item.activityCode, activityIds, item.activityId)
    );
  }, [viewMode, dailyData, allAttendances, role, activityIds, selectedMonth]);

  // Extract distinct activities available for selected date / dataset
  const availableActivities = useMemo(() => {
    if (viewMode === "daily" && dailyData?.activities) {
      return dailyData.activities.filter((act) =>
        isActivityAllowedForRole(role, act.activityName, act.activityCode, activityIds, act.activityId)
      );
    }

    const map = new Map<
      string,
      {
        activityId: string;
        activityName: string;
        activityCode: string;
        totalStudents: number;
        presentCount: number;
        absentCount: number;
        sessionFeeTotal: number;
        records: Attendance[];
      }
    >();

    for (const item of activeRecords) {
      const id = item.activityId || "general";
      if (!map.has(id)) {
        map.set(id, {
          activityId: item.activityId || "",
          activityName: item.activityName || "General Activity",
          activityCode: item.activityCode || "",
          totalStudents: 0,
          presentCount: 0,
          absentCount: 0,
          sessionFeeTotal: 0,
          records: [],
        });
      }
      const group = map.get(id)!;
      group.totalStudents += 1;
      if (item.status === "Present") {
        group.presentCount += 1;
        group.sessionFeeTotal += item.sessionFee || 0;
      } else {
        group.absentCount += 1;
      }
      group.records.push(item);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.activityName.localeCompare(b.activityName)
    );
  }, [viewMode, dailyData, activeRecords, role, activityIds]);

  const activityRecords = useMemo(() => filterActivityRecords(activeRecords, selectedActivityId), [activeRecords, selectedActivityId]);

  const groupedDailyRecords = useMemo(() => {
    if (viewMode !== "daily") {
      return activityRecords as GroupedAttendanceRow[];
    }

    const map = new Map<string, GroupedAttendanceRow>();

    for (const record of activityRecords) {
      const studentKey =
        record.studentId || record.enrollmentId || `${record.studentName}-${record.studentCode}`;

      const existing = map.get(studentKey);

      const activityIds = [
        ...(existing?.activityIds ?? []),
        ...(record.activityId ? [record.activityId] : []),
      ].filter((id, index, array) => id && array.indexOf(id) === index);

      const mergedActivities = [
        ...(existing?.activityName ? [existing.activityName] : []),
        ...(record.activityName ? [record.activityName] : []),
      ]
        .filter(Boolean)
        .filter((name, index, array) => array.indexOf(name) === index)
        .join(", ");

      const mergedCodes = [
        ...(existing?.activityCode ? [existing.activityCode] : []),
        ...(record.activityCode ? [record.activityCode] : []),
      ]
        .filter(Boolean)
        .filter((code, index, array) => array.indexOf(code) === index)
        .join(", ");

      const mergedNotes = [existing?.notes, record.notes]
        .filter(Boolean)
        .filter((note, index, array) => array.indexOf(note) === index)
        .join(" • ");

      const mergedRecord: GroupedAttendanceRow = {
        ...(existing ?? record),
        id: existing?.id ?? record.id,
        attendanceCode: existing?.attendanceCode || record.attendanceCode || "",
        activityId: existing?.activityId || record.activityId,
        activityName: mergedActivities,
        activityCode: mergedCodes,
        sessionFee: (Number(existing?.sessionFee) || 0) + (Number(record.sessionFee) || 0),
        status:
          existing?.status === "Present" || record.status === "Present"
            ? "Present"
            : "Absent",
        notes: mergedNotes,
        activityIds,
        groupedRecords: [...(existing?.groupedRecords || []), record],
      };

      map.set(studentKey, mergedRecord);
    }

    return Array.from(map.values()).sort((a, b) =>
      (a.studentName || "").localeCompare(b.studentName || "")
    );
  }, [viewMode, activityRecords]);

  const listRecords = viewMode === "daily" ? groupedDailyRecords : activityRecords;

  const classHistory = useMemo(() => {
    const allowedRecords = allAttendances.filter((record) =>
      isActivityAllowedForRole(role, record.activityName, record.activityCode, activityIds, record.activityId)
    );
    return getAttendedClasses(allowedRecords, selectedActivityId, selectedMonth);
  }, [allAttendances, role, activityIds, selectedActivityId, selectedMonth]);

  // Filter records by activity, search, and status
  const filteredAttendances = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return listRecords.filter((record) => {
      const grouped = record as GroupedAttendanceRow;
      const recordActivityIds = grouped.activityIds && grouped.activityIds.length > 0
        ? grouped.activityIds
        : record.activityId
          ? [record.activityId]
          : [];

      // Activity filter
      if (
        selectedActivityId !== "all" &&
        !recordActivityIds.includes(selectedActivityId)
      ) {
        return false;
      }

      // Search term
      const matchesSearch =
        !search ||
        record.studentName?.toLowerCase().includes(search) ||
        record.studentCode?.toLowerCase().includes(search) ||
        record.activityName?.toLowerCase().includes(search) ||
        record.activityCode?.toLowerCase().includes(search) ||
        record.attendanceCode?.toLowerCase().includes(search) ||
        record.enrollmentCode?.toLowerCase().includes(search) ||
        record.notes?.toLowerCase().includes(search) ||
        getAttendanceTeachers(grouped.groupedRecords || [record]).some((teacher) => teacher.name.toLowerCase().includes(search));

      // Status filter
      const matchesStatus =
        filterStatus === "All" || record.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [listRecords, selectedActivityId, searchTerm, filterStatus]);

  // Statistics calculation for the current view
  const totalStudentsCount = activityRecords.length;
  const presentCount = useMemo(
    () => activityRecords.filter((item) => item.status === "Present").length,
    [activityRecords]
  );
  const absentCount = useMemo(
    () => activityRecords.filter((item) => item.status === "Absent").length,
    [activityRecords]
  );
  const teacherCount = useMemo(() => getAttendanceTeachers(activityRecords).filter((teacher) => teacher.id !== "unknown").length, [activityRecords]);

  const presentPercentage =
    totalStudentsCount > 0
      ? Math.round((presentCount / totalStudentsCount) * 100)
      : 0;

  // Handlers
  const handleEdit = (recordId: string) => {
    const matchingRecord = activeRecords.find((record) => record.id === recordId);

    if (matchingRecord?.studentId) {
      navigate(
        `/attendance/student/${encodeURIComponent(matchingRecord.studentId)}/${encodeURIComponent(matchingRecord.sessionDateBS || matchingRecord.sessionDate)}`
      );
      return;
    }

    navigate(`/attendance/edit/${recordId}`);
  };

  const visibleRecords = attendanceSelectionRecords(filteredAttendances);
  const selectedRecords = selection.scope === selectionScope ? visibleRecords.filter((record) => selection.ids.includes(record.id!)) : [];
  const selectedIds = selectedRecords.map((record) => record.id!);

  const handleDeleteRecords = async (records: Attendance[]) => {
    if (!isAdmin || deletionInProgress.current || !records.length) return;
    if (!window.confirm(`Delete ${records.length} attendance ${records.length === 1 ? "record" : "records"}? Selected student rows include all activity records shown in the current filter. This cannot be undone.`)) return;
    deletionInProgress.current = true;
    setDeleting(true);
    setDeleteMessage("");
    try {
      const result = await deleteAttendanceRecords(records);
      setDeleteMessage(`${result.deleted.length} attendance records deleted.${result.failed.length ? ` ${result.failed.length} could not be deleted. Refresh and retry those records.` : ""}`);
      const deletedIds = new Set(result.deleted.map((record) => record.id));
      setSelection((previous) => ({ ...previous, ids: previous.ids.filter((id) => !deletedIds.has(id)) }));
      setRefreshVersion((value) => value + 1);
      const dates = await fetchAttendanceDatesBS();
      setRecordedDates(dates);
    } catch (error) {
      console.error("Error deleting attendance:", error);
      setDeleteMessage("Could not finish refreshing attendance. Refresh the page before retrying.");
      setRefreshVersion((value) => value + 1);
    } finally {
      deletionInProgress.current = false;
      setDeleting(false);
    }
  };

  const handleDelete = (recordId: string) => {
    const row = filteredAttendances.find((record) => record.id === recordId);
    if (row) void handleDeleteRecords(attendanceSelectionRecords([row]));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("All");
    setSelectedActivityId("all");
  };

  const hasFilters =
    searchTerm.trim() !== "" ||
    filterStatus !== "All" ||
    selectedActivityId !== "all";

  const isToday = selectedDateBS === todayBS;

  async function handleSendAbsenceAlerts() {
    const absentRecords = activityRecords.filter((record) => record.status === "Absent");
    if (absentRecords.length === 0) return;

    try {
      setSendingAlerts(true);
      const results = await Promise.all(absentRecords.map(async (record) => {
        const student = await getStudentById(record.studentId);
        const recipient = student?.guardianEmail || student?.parentEmail || "";
        if (!recipient) return false;

        await queueEmail({
          to: recipient,
          subject: `Attendance alert for ${record.studentName}`,
          text: `Dear Parent / Guardian,\n\n${record.studentName} was marked absent on ${record.sessionDateBS || selectedDateBS} BS for ${record.activityName}.\n\nPlease contact the academy if you need more information.`,
          html: `<p>Dear Parent / Guardian,</p><p><strong>${record.studentName}</strong> was marked absent on <strong>${record.sessionDateBS || selectedDateBS} BS</strong> for ${record.activityName}.</p><p>Please contact the academy if you need more information.</p>`,
        });
        return true;
      }));
      const sentCount = results.filter(Boolean).length;
      setAlertMessage(`Queued ${sentCount} attendance alert${sentCount === 1 ? "" : "s"}. ${absentRecords.length - sentCount} student${absentRecords.length - sentCount === 1 ? "" : "s"} have no parent email.`);
    } catch (error) {
      console.error("Error sending attendance alerts:", error);
      setAlertMessage("Unable to queue attendance alerts.");
    } finally {
      setSendingAlerts(false);
    }
  }

  return (
    <div className="ui-page attendance-page mx-auto w-full min-w-0 space-y-6">
      
      {/* =====================================================
          PAGE HEADER & VIEW TOGGLES
      ====================================================== */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="ui-page-title">
            Attendance
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Review attendance, classes and teachers by Nepali date.
          </p>
        </div>

        {/* Action Buttons & View Mode */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* View Mode Toggle */}
          <div className="ui-surface inline-flex p-1">
            <button
              type="button"
              onClick={() => setViewMode("daily")}
              aria-pressed={viewMode === "daily"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "daily"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarDays size={14} />
              Daily view
            </button>

            <button
              type="button"
              onClick={() => setViewMode("all")}
              aria-pressed={viewMode === "all"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "all"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListFilter size={14} />
              Monthly view
            </button>
          </div>

          {/* Record Attendance CTA */}
          <button
            type="button"
            onClick={() =>
              navigate(
                `/attendance/add?date=${selectedDateBS}${
                  selectedActivityId !== "all"
                    ? `&activity=${selectedActivityId}`
                    : ""
                }`
              )
            }
            className="ui-button inline-flex items-center justify-center gap-2 bg-brand-600 py-2.5 text-white transition hover:bg-brand-700"
          >
            {activeRecords.length > 0 && viewMode === "daily" ? (
              <>
                <Edit3 size={16} />
                Update attendance
              </>
            ) : (
              <>
                <Plus size={16} />
                Mark Attendance
              </>
            )}
          </button>
        </div>
      </div>

      <AttendanceReminder records={allAttendances} todayBS={todayBS} ready={!isLoading && !loadError} />
      {loadError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load attendance. Refresh the page to try again.
        </p>
      )}

      {/* =====================================================
          BS CALENDAR DATE NAVIGATOR (DAILY VIEW ONLY)
      ====================================================== */}
      {viewMode === "daily" && (
        <AttendanceDateNavigator
          selectedDateBS={selectedDateBS}
          onDateChange={setSelectedDateBS}
          recordedDates={recordedDates}
          totalRecordsCount={activeRecords.length}
        />
      )}

      {viewMode === "all" && <BSMonthNavigator month={selectedMonth} currentMonth={todayBS.slice(0, 7)}
        onChange={(month) => setSelectedDateBS(month === todayBS.slice(0, 7) ? todayBS : `${month}-01`)} />}

      {/* =====================================================
          SUMMARY METRICS
      ====================================================== */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        
        {/* Total Students */}
        <div className="ui-surface p-3 sm:p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {viewMode === "daily"
                  ? isToday
                    ? "Today's Students"
                    : "Students on Date"
                  : "Total Records"}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {totalStudentsCount}
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Users size={17} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {availableActivities.length} active{" "}
            {availableActivities.length === 1 ? "activity" : "activities"}
          </p>
        </div>

        {/* Present Count */}
        <div className="ui-surface p-3 sm:p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600">
                Present
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {presentCount}
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={17} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="font-semibold text-emerald-600">
              {presentPercentage}% attendance rate
            </span>
          </div>
        </div>

        {/* Absent Count */}
        <div className="ui-surface p-3 sm:p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-rose-600">
                Absent
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {absentCount}
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <XCircle size={17} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {totalStudentsCount > 0
              ? `${100 - presentPercentage}% absent rate`
              : "No absences recorded"}
          </p>
        </div>

        {/* Attendance recorders */}
        {(
          <div className="ui-surface p-3 sm:p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Teachers
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  {teacherCount}
                </p>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <UserRound size={17} />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Recorded by these users
            </p>
          </div>
        )}
      </div>

      {/* =====================================================
          ACTIVITY CORRESPONDENCE / TABS (Hidden for specific roled staff)
      ====================================================== */}
      {(role === "admin" || isTeacherRole(role)) && availableActivities.length > 0 && (
        <div className="ui-surface p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-600" />
              <h2 className="ui-section-title text-sm">
                Activities
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Filter by activity · P = present, A = absent
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* All Activities Chip */}
            <button
              type="button"
              onClick={() => setSelectedActivityId("all")}
              aria-pressed={selectedActivityId === "all"}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                selectedActivityId === "all"
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>All Activities</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  selectedActivityId === "all"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {activeRecords.length}
              </span>
            </button>

            {/* Individual Activities */}
            {availableActivities.map((act) => {
              const isSelected = selectedActivityId === act.activityId;
              return (
                <button
                  key={act.activityId}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    setSelectedActivityId(
                      isSelected ? "all" : act.activityId
                    )
                  }
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-brand-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: activityColors[act.activityId]?.color || "#94A3B8" }} />
                  <span>{act.activityName}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isSelected
                        ? "bg-brand-700 text-white"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {act.presentCount}P / {act.absentCount}A
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="ui-surface">
        {/* =====================================================
            SEARCH & FILTER CONTROLS
        ====================================================== */}
        <div className="attendance-toolbar border-b border-slate-100 p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_160px_auto]">
            <div className="min-w-0">
              <AttendanceSearch
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>

            <ListSortControl />

            <AttendanceFilters
              status={filterStatus}
              onStatusChange={(value) =>
                setFilterStatus(value as FilterStatus)
              }
            />

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ui-button inline-flex items-center justify-center gap-2 border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                <XCircle size={16} />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* =====================================================
            RECORDS LIST & EMPTY STATES
        ====================================================== */}
        {/* Table Header / Context Banner */}
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="ui-section-title text-sm">
              {viewMode === "daily"
                ? `Records · ${formatBSDate(selectedDateBS, "full")}`
                : `Attendance · ${selectedMonth} BS`}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-800">
                {filteredAttendances.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800">
                {activeRecords.length}
              </span>{" "}
              attendance entries
              {selectedActivityId !== "all" && (
                <span>
                  {" "}
                  • Filtered by{" "}
                  <strong className="text-slate-700">
                    {
                      availableActivities.find(
                        (a) => a.activityId === selectedActivityId
                      )?.activityName || "selected activity"
                    }
                  </strong>
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {viewMode === "daily" && (
              <>
                {absentCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleSendAbsenceAlerts()}
                    disabled={sendingAlerts}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send size={13} />
                    {sendingAlerts ? "Sending alerts..." : `Alert ${absentCount} absent`}
                  </button>
                )}
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/attendance/add?date=${selectedDateBS}${
                      selectedActivityId !== "all"
                        ? `&activity=${selectedActivityId}`
                        : ""
                    }`
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600/20 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-600/10"
              >
                <Edit3 size={13} />
                Edit Date Roster
              </button>
              </>
            )}
          </div>
        </div>

        {alertMessage && (
          <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-800 sm:px-6">
            {alertMessage}
          </div>
        )}

        {isAdmin && filteredAttendances.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <p className="text-sm text-slate-600">{selectedRecords.length} activity records selected · Select all includes every filtered page.</p>
          <div className="flex gap-2">
            <button type="button" disabled={deleting || !selectedRecords.length} onClick={() => setSelection({ scope: selectionScope, ids: [] })} className="ui-button border border-slate-300 bg-white text-slate-700 disabled:opacity-50">Clear selection</button>
            <button type="button" disabled={deleting || isLoading || !selectedRecords.length} onClick={() => void handleDeleteRecords(selectedRecords)} className="ui-button inline-flex items-center gap-2 bg-rose-600 text-white disabled:opacity-50"><Trash2 size={16} />{deleting ? "Deleting..." : `Delete selected (${selectedRecords.length})`}</button>
          </div>
        </div>}
        {deleteMessage && <p role="status" className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{deleteMessage}</p>}

        {/* Table / Content */}
        <div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
              <p className="text-sm">Loading attendance data...</p>
            </div>
          ) : filteredAttendances.length === 0 ? (
            <div className="rounded-b-xl bg-slate-50/40 px-5 py-14 text-center">
              <div className="ui-surface mx-auto flex h-14 w-14 items-center justify-center text-slate-400">
                <ClipboardCheck size={28} />
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-900">
                {viewMode === "daily"
                  ? `No attendance recorded for ${formatBSDate(selectedDateBS, "full")}`
                  : "No attendance records found"}
              </h3>

              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                {viewMode === "daily"
                  ? `There are no attendance entries saved for ${selectedDateBS} BS. You can mark attendance for enrolled students now.`
                  : "Try clearing your filters or create a new attendance record."}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ui-button border border-slate-300 bg-white py-2.5 text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear Filters
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/attendance/add?date=${selectedDateBS}${
                        selectedActivityId !== "all"
                          ? `&activity=${selectedActivityId}`
                          : ""
                      }`
                    )
                  }
                  className="ui-button inline-flex items-center gap-2 bg-brand-600 py-2.5 text-white transition hover:bg-brand-700"
                >
                  <Plus size={17} />
                  Record Attendance for {selectedDateBS}
                </button>
              </div>
            </div>
          ) : (
            <AttendanceTable
              data={filteredAttendances}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isLoading={isLoading || deleting}
              canDelete={isAdmin}
              selectedIds={selectedIds}
              onSelectionChange={isAdmin ? (ids) => setSelection({ scope: selectionScope, ids }) : undefined}
              classHistory={classHistory}
              activityColors={activityColors}
            />
          )}
        </div>

      </div>
    </div>
  );
}
