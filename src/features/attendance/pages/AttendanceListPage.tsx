import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  Search,
  Users,
  XCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import type { Attendance } from "@/features/attendance/types/attendance.types";

import {
  fetchAttendances,
} from "@/features/attendance/services/attendance-list.service";

import {
  deleteAttendance,
} from "@/features/attendance/services/attendance.service";

import AttendanceSearch from "@/features/attendance/components/AttendanceSearch";
import AttendanceFilters from "@/features/attendance/components/AttendanceFilters";
import AttendanceTable from "@/features/attendance/components/AttendanceTable";

type FilterStatus =
  | "All"
  | "Present"
  | "Absent";

export default function AttendanceListPage() {
  const navigate = useNavigate();

  const [attendances, setAttendances] =
    useState<Attendance[]>([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filterStatus, setFilterStatus] =
    useState<FilterStatus>("All");

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    const loadAttendances = async () => {
      try {
        setIsLoading(true);

        const data = await fetchAttendances();

        setAttendances(data);
      } catch (error) {
        console.error(
          "Error loading attendances:",
          error
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadAttendances();
  }, []);

  const filteredAttendances =
    useMemo(() => {
      const search =
        searchTerm.trim().toLowerCase();

      return attendances.filter((record) => {
        const matchesSearch =
          !search ||
          record.studentName
            ?.toLowerCase()
            .includes(search) ||
          record.studentCode
            ?.toLowerCase()
            .includes(search) ||
          record.activityName
            ?.toLowerCase()
            .includes(search) ||
          record.activityCode
            ?.toLowerCase()
            .includes(search) ||
          record.attendanceCode
            ?.toLowerCase()
            .includes(search) ||
          record.enrollmentCode
            ?.toLowerCase()
            .includes(search);

        const matchesStatus =
          filterStatus === "All" ||
          record.status === filterStatus;

        return (
          matchesSearch &&
          matchesStatus
        );
      });
    }, [
      attendances,
      searchTerm,
      filterStatus,
    ]);

  const presentCount = useMemo(
    () =>
      filteredAttendances.filter(
        (item) => item.status === "Present"
      ).length,
    [filteredAttendances]
  );

  const absentCount = useMemo(
    () =>
      filteredAttendances.filter(
        (item) => item.status === "Absent"
      ).length,
    [filteredAttendances]
  );

  const uniqueStudents = useMemo(() => {
    return new Set(
      filteredAttendances.map(
        (item) => item.studentId
      )
    ).size;
  }, [filteredAttendances]);

  const handleEdit = (
    recordId: string
  ) => {
    navigate(
      `/attendance/edit/${recordId}`
    );
  };

  const handleDelete = async (
    recordId: string
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this attendance record?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAttendance(recordId);

      setAttendances((previous) =>
        previous.filter(
          (item) => item.id !== recordId
        )
      );
    } catch (error) {
      console.error(
        "Error deleting attendance:",
        error
      );

      alert(
        "Failed to delete attendance record."
      );
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("All");
  };

  const hasFilters =
    searchTerm.trim() !== "" ||
    filterStatus !== "All";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

      {/* ================= HEADER ================= */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <ClipboardCheck size={21} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Attendance
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Manage student attendance for all activities.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/attendance/add")
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
        >
          <Plus size={18} />
          Add Attendance
        </button>
      </div>

      {/* ================= SUMMARY ================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Total */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Records
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {filteredAttendances.length}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ClipboardCheck size={20} />
            </div>
          </div>
        </div>

        {/* Present */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Present
              </p>

              <p className="mt-2 text-2xl font-bold text-green-600">
                {presentCount}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        {/* Absent */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Absent
              </p>

              <p className="mt-2 text-2xl font-bold text-red-600">
                {absentCount}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <XCircle size={20} />
            </div>
          </div>
        </div>

        {/* Students */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Students
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {uniqueStudents}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* ================= FILTER CARD ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

        <div className="mb-4 flex items-center gap-2">
          <Search
            size={18}
            className="text-slate-500"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Search & Filter
            </h2>

            <p className="text-xs text-slate-500">
              Find attendance records quickly.
            </p>
          </div>
        </div>

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
              setFilterStatus(
                value as FilterStatus
              )
            }
          />

          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <XCircle size={16} />
              Clear
            </button>
          ) : (
            <div className="hidden lg:block" />
          )}
        </div>
      </div>

      {/* ================= RESULTS ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-semibold text-slate-900">
              Attendance Records
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-700">
                {filteredAttendances.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-700">
                {attendances.length}
              </span>{" "}
              records
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays size={15} />
            <span>BS Calendar</span>
          </div>
        </div>

        <div className="p-3 sm:p-5">
          {filteredAttendances.length === 0 &&
          !isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                <ClipboardCheck size={22} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                No attendance records found
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Try changing your search or filters,
                or create a new attendance record.
              </p>

              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear Filters
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    navigate("/attendance/add")
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <Plus size={17} />
                  Add Attendance
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <AttendanceTable
                data={filteredAttendances}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}