import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  Activity as ActivityIcon,
  CheckCircle2,
  Plus,
  Users,
} from "lucide-react";

import EnrollmentFilters from "../components/EnrollmentFilters";
import EnrollmentSearch from "../components/EnrollmentSearch";
import EnrollmentTable from "../components/EnrollmentTable";

import {
  deleteEnrollment,
  getEnrollments,
} from "../services/enrollment.service";

import type { Enrollment } from "../types/enrollment.types";

export default function EnrollmentListPage() {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] =
    useState<Enrollment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getEnrollments();

      setEnrollments(data);
    } catch (err) {
      console.error(err);

      setError(
        "Failed to load enrollments."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEnrollments();
  }, []);

  /* ---------------------------------------------
     FILTER
  --------------------------------------------- */

  const filteredEnrollments = useMemo(() => {
    const term =
      search.trim().toLowerCase();

    return enrollments.filter(
      (enrollment) => {
        const matchesSearch =
          !term ||
          enrollment.enrollmentCode
            .toLowerCase()
            .includes(term) ||
          enrollment.studentName
            .toLowerCase()
            .includes(term) ||
          enrollment.studentCode
            .toLowerCase()
            .includes(term) ||
          enrollment.activityName
            .toLowerCase()
            .includes(term) ||
          enrollment.activityCode
            .toLowerCase()
            .includes(term);

        const matchesStatus =
          statusFilter === "all" ||
          enrollment.status.toLowerCase() ===
            statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    enrollments,
    search,
    statusFilter,
  ]);

  /* ---------------------------------------------
     SUMMARY
  --------------------------------------------- */

  const activeCount = useMemo(
    () =>
      enrollments.filter(
        (item) =>
          item.status === "Active"
      ).length,
    [enrollments]
  );

  const inactiveCount =
    enrollments.length - activeCount;

  const totalFees = useMemo(
    () =>
      enrollments.reduce(
        (total, item) =>
          total +
          (typeof item.sessionFee ===
          "number"
            ? item.sessionFee
            : 0),
        0
      ),
    [enrollments]
  );

  /* ---------------------------------------------
     DELETE
  --------------------------------------------- */

  const handleDeleteEnrollment = async (
    enrollment: Enrollment
  ) => {
    if (!enrollment.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete enrollment ${enrollment.enrollmentCode}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteEnrollment(
        enrollment.id
      );

      await loadEnrollments();
    } catch (err) {
      console.error(err);

      alert(
        "Failed to delete enrollment."
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Academy Management
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Enrollments
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Connect students with academy
            activities and manage their
            enrollment fees.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/enrollments/add")
          }
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
        >
          <Plus size={17} />

          Add Enrollment
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users size={18} />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Total
              </p>

              <p className="text-xl font-bold text-slate-900">
                {enrollments.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Active
              </p>

              <p className="text-xl font-bold text-slate-900">
                {activeCount}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Users size={18} />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Inactive
              </p>

              <p className="text-xl font-bold text-slate-900">
                {inactiveCount}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ActivityIcon size={18} />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Session Fees
              </p>

              <p className="text-lg font-bold text-slate-900">
                Rs.{" "}
                {totalFees.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH / FILTER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <EnrollmentSearch
            value={search}
            onChange={setSearch}
          />

          <EnrollmentFilters
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        {(search ||
          statusFilter !== "all") && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {filteredEnrollments.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {enrollments.length}
              </span>{" "}
              enrollments
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

          <p className="mt-3 text-sm text-slate-500">
            Loading enrollments...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm font-medium text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadEnrollments()
            }
            className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50"
          >
            Try Again
          </button>
        </div>
      ) : (
       <EnrollmentTable
  enrollments={filteredEnrollments}
  onViewEnrollment={(enrollment) => {
    if (!enrollment.id) {
      return;
    }

    navigate(`/enrollments/edit/${enrollment.id}`);
  }}
  onEditEnrollment={(enrollment) => {
    if (!enrollment.id) {
      return;
    }

    navigate(`/enrollments/edit/${enrollment.id}`);
  }}
  onDeleteEnrollment={handleDeleteEnrollment}
/>
      )}
    </div>
  );
}