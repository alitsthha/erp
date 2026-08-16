import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  Search,
  Users,
  XCircle,
  Sparkles,
  Edit3,
  Wallet,
  ListFilter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import type {
  Attendance,
  DailyAttendanceRecord,
} from "@/features/attendance/types/attendance.types";

import {
  fetchAttendances,
  fetchDailyAttendance,
  fetchAttendanceDatesBS,
} from "@/features/attendance/services/attendance-list.service";

import { deleteAttendance } from "@/features/attendance/services/attendance.service";

import { getCurrentBSDate, formatBSDate, isTodayBS } from "@/utils/nepali-date";

import AttendanceDateNavigator from "@/features/attendance/components/AttendanceDateNavigator";
import AttendanceSearch from "@/features/attendance/components/AttendanceSearch";
import AttendanceFilters from "@/features/attendance/components/AttendanceFilters";
import AttendanceTable from "@/features/attendance/components/AttendanceTable";

type FilterStatus = "All" | "Present" | "Absent";
type ViewMode = "daily" | "all";

export default function AttendanceListPage() {
  const navigate = useNavigate();

  // Current BS Date by default
  const todayBS = useMemo(() => getCurrentBSDate(), []);
  const [selectedDateBS, setSelectedDateBS] = useState<string>(todayBS);

  // Daily records and all records
  const [dailyData, setDailyData] = useState<DailyAttendanceRecord | null>(null);
  const [allAttendances, setAllAttendances] = useState<Attendance[]>([]);
  const [recordedDates, setRecordedDates] = useState<string[]>([]);

  // Filters & State
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [selectedActivityId, setSelectedActivityId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("All");
  const [isLoading, setIsLoading] = useState(true);

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
      try {
        if (viewMode === "daily") {
          const data = await fetchDailyAttendance(selectedDateBS);
          if (!cancelled) {
            setDailyData(data);
          }
        } else {
          const data = await fetchAttendances();
          if (!cancelled) {
            setAllAttendances(data);
          }
        }
      } catch (error) {
        console.error("Error loading attendance:", error);
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
  }, [selectedDateBS, viewMode]);

  // Determine active raw records list based on view mode
  const activeRecords: Attendance[] = useMemo(() => {
    if (viewMode === "daily") {
      return dailyData?.attendances || [];
    }
    return allAttendances;
  }, [viewMode, dailyData, allAttendances]);

  // Extract distinct activities available for selected date / dataset
  const availableActivities = useMemo(() => {
    if (viewMode === "daily" && dailyData?.activities) {
      return dailyData.activities;
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
  }, [viewMode, dailyData, activeRecords]);

  // Filter records by activity, search, and status
  const filteredAttendances = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return activeRecords.filter((record) => {
      // Activity filter
      if (
        selectedActivityId !== "all" &&
        record.activityId !== selectedActivityId
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
        record.notes?.toLowerCase().includes(search);

      // Status filter
      const matchesStatus =
        filterStatus === "All" || record.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [activeRecords, selectedActivityId, searchTerm, filterStatus]);

  // Statistics calculation for the current view
  const totalStudentsCount = activeRecords.length;
  const presentCount = useMemo(
    () => activeRecords.filter((item) => item.status === "Present").length,
    [activeRecords]
  );
  const absentCount = useMemo(
    () => activeRecords.filter((item) => item.status === "Absent").length,
    [activeRecords]
  );
  const totalSessionFees = useMemo(
    () =>
      activeRecords
        .filter((item) => item.status === "Present")
        .reduce((sum, item) => sum + (Number(item.sessionFee) || 0), 0),
    [activeRecords]
  );

  const presentPercentage =
    totalStudentsCount > 0
      ? Math.round((presentCount / totalStudentsCount) * 100)
      : 0;

  // Handlers
  const handleEdit = (recordId: string) => {
    navigate(`/attendance/edit/${recordId}`);
  };

  const handleDelete = async (recordId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this attendance record?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAttendance(recordId);

      // Update state locally
      if (viewMode === "daily" && dailyData) {
        const updatedList = dailyData.attendances.filter(
          (item) => item.id !== recordId
        );
        setDailyData({
          ...dailyData,
          attendances: updatedList,
          totalRecords: updatedList.length,
          presentCount: updatedList.filter((r) => r.status === "Present").length,
          absentCount: updatedList.filter((r) => r.status === "Absent").length,
        });
      } else {
        setAllAttendances((previous) =>
          previous.filter((item) => item.id !== recordId)
        );
      }
    } catch (error) {
      console.error("Error deleting attendance:", error);
      alert("Failed to delete attendance record.");
    }
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

  const isToday = isTodayBS(selectedDateBS);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      
      {/* =====================================================
          PAGE HEADER & VIEW TOGGLES
      ====================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Attendance Management
            </span>
            <span className="text-xs text-slate-400">• BS Nepali Calendar</span>
          </div>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Attendance Records
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Track daily attendance entries in correspondence to activities by Nepali date.
          </p>
        </div>

        {/* Action Buttons & View Mode */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("daily")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "daily"
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarDays size={14} />
              Daily BS View
            </button>

            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "all"
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListFilter size={14} />
              All History
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            {activeRecords.length > 0 && viewMode === "daily" ? (
              <>
                <Edit3 size={16} />
                Edit / Take for Date
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

      {/* =====================================================
          SUMMARY METRICS
      ====================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        
        {/* Total Students */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {viewMode === "daily"
                  ? isToday
                    ? "Today's Students"
                    : "Students on Date"
                  : "Total Records"}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {totalStudentsCount}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Users size={20} />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {availableActivities.length} active{" "}
            {availableActivities.length === 1 ? "activity" : "activities"}
          </p>
        </div>

        {/* Present Count */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Present
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-700">
                {presentCount}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="font-semibold text-emerald-600">
              {presentPercentage}% attendance rate
            </span>
          </div>
        </div>

        {/* Absent Count */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                Absent
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-rose-700">
                {absentCount}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <XCircle size={20} />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {totalStudentsCount > 0
              ? `${100 - presentPercentage}% absent rate`
              : "No absences recorded"}
          </p>
        </div>

        {/* Session Fee Total */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Session Fees Total
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                Rs. {totalSessionFees.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Wallet size={20} />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Auto-billed from present sessions
          </p>
        </div>
      </div>

      {/* =====================================================
          ACTIVITY CORRESPONDENCE / TABS
      ====================================================== */}
      {availableActivities.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Activity Breakdown
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Click an activity to filter records
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* All Activities Chip */}
            <button
              type="button"
              onClick={() => setSelectedActivityId("all")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                selectedActivityId === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>All Activities</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  selectedActivityId === "all"
                    ? "bg-slate-800 text-slate-200"
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
                  onClick={() =>
                    setSelectedActivityId(
                      isSelected ? "all" : act.activityId
                    )
                  }
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{act.activityName}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isSelected
                        ? "bg-blue-700 text-white"
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

      {/* =====================================================
          SEARCH & FILTER CONTROLS
      ====================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <div className="min-w-0">
            <AttendanceSearch
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>

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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        
        {/* Table Header / Context Banner */}
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-bold text-slate-900">
              {viewMode === "daily"
                ? `Attendance for ${formatBSDate(selectedDateBS, "full")} (${selectedDateBS} BS)`
                : "All Historical Attendance Records"}
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
                      )?.activityName
                    }
                  </strong>
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === "daily" && (
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <Edit3 size={13} />
                Edit Date Roster
              </button>
            )}
          </div>
        </div>

        {/* Table / Content */}
        <div className="p-4 sm:p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
              <p className="text-sm">Loading attendance data...</p>
            </div>
          ) : filteredAttendances.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
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
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
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
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
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
              isLoading={isLoading}
            />
          )}
        </div>

      </div>
    </div>
  );
}