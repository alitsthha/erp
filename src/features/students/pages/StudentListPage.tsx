import { useSessionState } from "@/hooks/useSessionState";
import ListSortControl from "@/components/common/ListSortControl";
import { useEffect, useMemo, useRef, useState } from "react";
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
import ConfirmDialog from "@/components/common/ConfirmDialog";
import PaginatedList from "@/components/common/PaginatedList";
import { getStudentDeletionReview, type StudentDeletionReview } from "../services/student-deletion-review.service";
import { formatCurrency } from "@/utils/currency";

import {
  getStudents,
} from "../services/student.service";
import { deleteStudent } from "../services/student-delete.service";

import type { Student } from "../types/student.types";

import { useAuth } from "@/app/providers/AuthProvider";
import { isActivityAllowedForRole, isTeacherRole } from "@/lib/rbac";
import { getAllEnrollments } from "@/features/enrollments/services/enrollment.service";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";

export default function StudentListPage() {
  const navigate = useNavigate();
  const { role, isAdmin, activityIds } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deletionReview, setDeletionReview] = useState<StudentDeletionReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const reviewRequest = useRef(0);

  const [search, setSearch] = useSessionState("students:search", "");
  const [statusFilter, setStatusFilter] = useSessionState("students:statusFilter", "all");

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
    if (!role || role === "admin") {
      return null;
    }

    if (activityIds.length === 0 && isTeacherRole(role)) {
      return null;
    }

    const ids = new Set<string>();
    for (const e of enrollments) {
      if (isActivityAllowedForRole(role, e.activityName, e.activityCode, activityIds, e.activityId)) {
        if (e.studentId) ids.add(e.studentId);
      }
    }
    return ids;
  }, [enrollments, role, activityIds]);

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

      const guardian = student.guardianName ?? student.parentName ?? "";

      const matchesSearch =
        keyword === "" ||
        name.toLowerCase().includes(keyword) ||
        code.toLowerCase().includes(keyword) ||
        guardian.toLowerCase().includes(keyword) ||
        (student.guardianPhone ?? student.parentPhone ?? "").includes(keyword);

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
    if (!student.id || !isAdmin || isDeleting) return;
    const request = ++reviewRequest.current;
    setDeleteError("");
    setStudentToDelete(student);
    setDeletionReview(null);
    setReviewLoading(true);
    try {
      const review = await getStudentDeletionReview(student.id);
      if (request === reviewRequest.current) setDeletionReview(review);
    } catch (error) {
      if (request === reviewRequest.current) setDeleteError(error instanceof Error ? error.message : "Could not check enrollments and payments. Please retry.");
    } finally {
      if (request === reviewRequest.current) setReviewLoading(false);
    }
  }

  async function confirmDelete() {
    const student = studentToDelete;
    if (!student?.id || !isAdmin || isDeleting || reviewLoading || !deletionReview || deletionReview.unpaidInvoices.length > 0) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteStudent(student.id);
      setStudents((current) => current.filter((item) => item.id !== student.id));
      setEnrollments((current) => current.filter((item) => item.studentId !== student.id));
      setStudentToDelete(null);
    } catch (error) {
      console.error(error);
      setDeleteError(error instanceof Error ? error.message : "Failed to delete student. Please try again.");
    } finally {
      setIsDeleting(false);
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
      <ConfirmDialog
        open={Boolean(studentToDelete)}
        title="Delete student?"
        description={<>
          <p>Delete <strong>{studentToDelete?.fullName}</strong> and their linked enrollments, attendance, invoices, and payments? This cannot be undone.</p>
          {reviewLoading && <p role="status" className="mt-3">Checking enrollments and payment clearance…</p>}
          {deletionReview && <>
            <h3 className="mt-4 font-semibold text-slate-900">Linked enrollments ({deletionReview.enrollments.length})</h3>
            {deletionReview.enrollments.length === 0 ? <p>No linked enrollments.</p> :
              <PaginatedList sortable={false} items={deletionReview.enrollments} label="Linked enrollments">{(enrollment) =>
                <div key={enrollment.id} className="mt-2 rounded-lg border border-slate-200 p-2">
                  <strong>{enrollment.activityName || enrollment.activityCode || "Activity"}</strong>
                  <p className="text-xs text-slate-500">{enrollment.enrollmentCode} · {enrollment.status || "Active"} · {enrollment.enrollmentDate}</p>
                </div>
              }</PaginatedList>}
            {deletionReview.unpaidInvoices.length > 0 ? <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">
              <p className="font-semibold">Deletion blocked: {formatCurrency(deletionReview.outstandingAmount)} outstanding.</p>
              <p>Clear all unpaid invoices in Billing before deleting this student.</p>
              <PaginatedList sortable={false} items={deletionReview.unpaidInvoices} label="Unpaid invoices">{(invoice) =>
                <div key={invoice.id} className="flex flex-wrap justify-between gap-2 py-1"><span>{invoice.invoiceNumber}</span><strong>{formatCurrency(invoice.dueAmount)}</strong></div>
              }</PaginatedList>
            </div> : <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-emerald-800">No outstanding invoice balance. Payments will be checked again before deletion.</p>}
          </>}
          {deleteError && <p role="alert" className="mt-3 text-red-600">{deleteError}</p>}
          {!reviewLoading && !isDeleting && studentToDelete && <button type="button" className="mt-3 text-sm font-medium text-brand-700 underline" onClick={() => void handleDelete(studentToDelete)}>Refresh payment check</button>}
        </>}
        confirmLabel="Delete Student"
        isLoading={isDeleting}
        confirmDisabled={reviewLoading || !deletionReview || deletionReview.unpaidInvoices.length > 0}
        onConfirm={() => void confirmDelete()}
        onCancel={() => { if (!isDeleting) { reviewRequest.current++; setStudentToDelete(null); } }}
      />

      {/* ============================================
          PAGE HEADER
      ============================================ */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="min-w-0">
          <h1 className="ui-page-title">
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
            className="ui-button inline-flex w-full items-center justify-center gap-2 bg-brand-600 py-2.5 text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus size={18} />
            Add Student
          </button>
        )}
      </div>

      {/* ============================================
          STUDENT DIRECTORY
      ============================================ */}

      <div className="ui-surface overflow-hidden">

        {/* Section Header */}

        <div className="border-b border-slate-200 px-5 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Users size={18} />
            </div>

            <div className="min-w-0">

              <h2 className="ui-section-title text-sm">
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
                className="ui-field-icon text-slate-400"
              />

              <StudentSearch
                value={search}
                onChange={setSearch}
              />

            </div>

            <ListSortControl />

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
            className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"
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
                className="text-left text-xs font-medium text-brand-600 transition hover:text-brand-700"
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
        <div className="ui-surface p-10 text-center">

          <div className="flex flex-col items-center justify-center gap-3">

            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600"
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
            className="ui-button mt-4 inline-flex items-center gap-2 bg-red-600 py-2 text-white transition hover:bg-red-700"
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
