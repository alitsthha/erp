import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  RotateCw,
  Search,
  Users,
} from "lucide-react";

import StudentFilters from "../components/StudentFilters";
import StudentSearch from "../components/StudentSearch";
import StudentTable from "../components/StudentTable";

import {
  getStudents,
  deleteStudent,
} from "../services/student.service";

import type { Student } from "../types/student.types";

import { useAuth } from "@/app/providers/AuthProvider";
import { isActivityAllowedForRole } from "@/lib/rbac";
import { getAllEnrollments } from "@/features/enrollments/services/enrollment.service";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";

export default function StudentListPage() {
  const navigate = useNavigate();
  const { role, isAdmin } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // --------------------------------------------------
  // LOAD STUDENTS & ENROLLMENTS
  // --------------------------------------------------

  async function loadStudents() {
    try {
      setLoading(true);
      setError("");

      const [data, enrollmentData] = await Promise.all([
        getStudents(),
        getAllEnrollments(),
      ]);

      setStudents(data);
      setEnrollments(enrollmentData);
    } catch (error) {
      console.error(error);
      setError("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  // Allowed Student IDs for specialized teacher role
  const allowedStudentIds = useMemo(() => {
    if (!role || role === "admin" || role === "teacher") {
      return null;
    }
    const ids = new Set<string>();
    for (const e of enrollments) {
      if (isActivityAllowedForRole(role, e.activityName, e.activityCode)) {
        if (e.studentId) ids.add(e.studentId);
      }
    }
    return ids;
  }, [enrollments, role]);

  // --------------------------------------------------
  // FILTER STUDENTS
  // --------------------------------------------------

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return students.filter((student) => {
      if (allowedStudentIds && !allowedStudentIds.has(student.id || "")) {
        return false;
      }

      const name = student.fullName ?? "";
      const code = student.studentCode ?? "";

      const guardian = student.guardianName ?? "";

      const matchesSearch =
        keyword === "" ||
        name.toLowerCase().includes(keyword) ||
        code.toLowerCase().includes(keyword) ||
        guardian.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        student.status.toLowerCase() ===
          statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter, allowedStudentIds]);

  // --------------------------------------------------
  // DELETE STUDENT
  // --------------------------------------------------

  async function handleDelete(student: Student) {
    if (!student.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.fullName}?`
    );

    if (!confirmed) return;

    try {
      await deleteStudent(student.id);

      await loadStudents();
    } catch (error) {
      console.error(error);

      window.alert(
        "Failed to delete student."
      );
    }
  }

  // --------------------------------------------------
  // CLEAR FILTERS
  // --------------------------------------------------

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-w-0 space-y-6">

      {/* ============================================
          PAGE HEADER
      ============================================ */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Students
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage student profiles, guardians and
            enrollment information.
          </p>
        </div>

        {/* Add Student CTA (Admin Only) */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate("/students/add")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus size={18} />
            Add Student
          </button>
        )}
      </div>

      {/* ============================================
          STUDENT DIRECTORY
      ============================================ */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* Section Header */}

        <div className="border-b border-slate-200 px-5 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users size={18} />
            </div>

            <div className="min-w-0">

              <h2 className="text-sm font-semibold text-slate-900">
                Student Directory
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Search and filter registered students.
              </p>

            </div>

          </div>

        </div>

        {/* ==========================================
            SEARCH & FILTERS
        ========================================== */}

        <div className="p-5">

          <div className="flex flex-col gap-3 lg:flex-row">

            {/* Search */}

            <div className="relative min-w-0 flex-1">

              <Search
                size={18}
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <StudentSearch
                value={search}
                onChange={setSearch}
              />

            </div>

            {/* Status Filter */}

            <div className="w-full lg:w-52">

              <StudentFilters
                value={statusFilter}
                onChange={setStatusFilter}
              />

            </div>

          </div>

          {/* Filter Information */}

          <div
            className="
              mt-4
              flex
              flex-col
              gap-2
              border-t
              border-slate-100
              pt-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <p className="text-xs text-slate-500">

              Showing{" "}

              <span className="font-semibold text-slate-900">
                {filteredStudents.length}
              </span>

              {" "}of{" "}

              <span className="font-semibold text-slate-900">
                {students.length}
              </span>

              {" "}students

            </p>

            {(search || statusFilter !== "all") && (
              <button
                type="button"
                onClick={clearFilters}
                className="
                  text-left
                  text-xs
                  font-medium
                  text-blue-600
                  transition
                  hover:text-blue-700
                "
              >
                Clear filters
              </button>
            )}

          </div>

        </div>

      </div>

      {/* ============================================
          LOADING
      ============================================ */}

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">

          <div className="flex flex-col items-center justify-center gap-3">

            <div
              className="
                h-8
                w-8
                animate-spin
                rounded-full
                border-2
                border-slate-200
                border-t-blue-600
              "
            />

            <p className="text-sm text-slate-500">
              Loading students...
            </p>

          </div>

        </div>
      )}

      {/* ============================================
          ERROR
      ============================================ */}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">

          <p className="text-sm font-medium text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadStudents()
            }
            className="
              mt-4
              inline-flex
              items-center
              gap-2
              rounded-lg
              bg-red-600
              px-4
              py-2
              text-sm
              font-medium
              text-white
              transition
              hover:bg-red-700
            "
          >
            <RotateCw size={16} />

            Try Again
          </button>

        </div>
      )}

      {/* ============================================
          STUDENT TABLE
      ============================================ */}

      {!loading && !error && (
        <div className="min-w-0 overflow-hidden">

          <StudentTable
            students={filteredStudents}

            onViewStudent={(student) =>
              navigate(
                `/students/profile/${student.id}`
              )
            }

            onEditStudent={(student) =>
              navigate(
                `/students/edit/${student.id}`
              )
            }

            onDeleteStudent={handleDelete}
          />

        </div>
      )}

    </div>
  );
}