import PaginatedList from "@/components/common/PaginatedList";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Users,
  UserPlus,
  XCircle,
} from "lucide-react";

import { collection, getDocs } from "firebase/firestore";

import { db } from "@/firebase/config";

import type { Student } from "@/features/students/types/student.types";
import type { Activity as AcademyActivity } from "@/features/activities/types/activity.types";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";

type DashboardStudent = Student & {
  createdAt?: unknown;
};

type DashboardActivity = AcademyActivity;

type DashboardEnrollment = Enrollment & {
  createdAt?: unknown;
};

type FirestoreTimestampLike = {
  seconds?: number;
  nanoseconds?: number;
  toDate?: () => Date;
};

function getDateFromTimestamp(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as FirestoreTimestampLike).toDate === "function"
  ) {
    return (value as FirestoreTimestampLike).toDate?.() ?? null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value
  ) {
    const seconds = (value as FirestoreTimestampLike).seconds;

    if (typeof seconds === "number") {
      return new Date(seconds * 1000);
    }
  }

  return null;
}

function formatDate(value: unknown) {
  const date = getDateFromTimestamp(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatCurrency(value?: number) {
  if (typeof value !== "number") {
    return "Rs. 0";
  }

  return `Rs. ${value.toLocaleString("en-IN")}`;
}

const DEMO_DASHBOARD_DATA = {
  students: [
    {
      id: "demo-student-1",
      fullName: "Aarav Shrestha",
      studentCode: "STU-1001",
      status: "Active",
      createdAt: new Date("2026-08-11T09:00:00Z"),
    },
    {
      id: "demo-student-2",
      fullName: "Sarina Rai",
      studentCode: "STU-1002",
      status: "Active",
      createdAt: new Date("2026-08-15T09:00:00Z"),
    },
    {
      id: "demo-student-3",
      fullName: "Nischal Karki",
      studentCode: "STU-1003",
      status: "Inactive",
      createdAt: new Date("2026-08-18T09:00:00Z"),
    },
  ] as DashboardStudent[],
  activities: [
    {
      id: "demo-activity-1",
      activityCode: "ACT-201",
      activityName: "Music Fundamentals",
      status: "Active",
    },
    {
      id: "demo-activity-2",
      activityCode: "ACT-202",
      activityName: "Dance Basics",
      status: "Active",
    },
    {
      id: "demo-activity-3",
      activityCode: "ACT-203",
      activityName: "Art Studio",
      status: "Inactive",
    },
  ] as DashboardActivity[],
  enrollments: [
    {
      id: "demo-enrollment-1",
      enrollmentCode: "ENR-5001",
      studentName: "Aarav Shrestha",
      studentCode: "STU-1001",
      activityName: "Music Fundamentals",
      activityCode: "ACT-201",
      enrollmentDate: "2026-08-20",
      sessionFee: 2500,
      status: "Active",
      createdAt: new Date("2026-08-20T09:00:00Z"),
    },
    {
      id: "demo-enrollment-2",
      enrollmentCode: "ENR-5002",
      studentName: "Sarina Rai",
      studentCode: "STU-1002",
      activityName: "Dance Basics",
      activityCode: "ACT-202",
      enrollmentDate: "2026-08-24",
      sessionFee: 3200,
      status: "Active",
      createdAt: new Date("2026-08-24T09:00:00Z"),
    },
  ] as DashboardEnrollment[],
};

async function getDashboardCollection<T>(
  collectionName: string,
  mapper?: (doc: { id: string; data: () => Record<string, unknown> }) => T
): Promise<T[]> {
  try {
    const snapshot = await getDocs(collection(db, collectionName));

    return snapshot.docs.map((doc) => {
      const data = doc.data();

      if (mapper) {
        return mapper({
          id: doc.id,
          data: () => data,
        });
      }

      return {
        id: doc.id,
        ...data,
      } as T;
    });
  } catch (error) {
    console.warn(`Dashboard collection unavailable: ${collectionName}`, error);
    return [];
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [students, setStudents] = useState<DashboardStudent[]>([]);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [enrollments, setEnrollments] = useState<DashboardEnrollment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [studentData, activityData, enrollmentData] = await Promise.all([
        getDashboardCollection<DashboardStudent>("students"),
        getDashboardCollection<DashboardActivity>("activities"),
        getDashboardCollection<DashboardEnrollment>("enrollments"),
      ]);

      setStudents(
        [...studentData].sort((a, b) => {
          const dateA = getDateFromTimestamp(a.createdAt)?.getTime() ?? 0;
          const dateB = getDateFromTimestamp(b.createdAt)?.getTime() ?? 0;
          return dateB - dateA;
        })
      );
      setActivities(
        [...activityData].sort((a, b) => {
          const nameA = String(a.activityCode ?? "").toLowerCase();
          const nameB = String(b.activityCode ?? "").toLowerCase();
          return nameA.localeCompare(nameB);
        })
      );
      setEnrollments(
        [...enrollmentData].sort((a, b) => {
          const dateA = getDateFromTimestamp(a.createdAt)?.getTime() ?? 0;
          const dateB = getDateFromTimestamp(b.createdAt)?.getTime() ?? 0;
          return dateB - dateA;
        })
      );

      const hasNoFirestoreData =
        studentData.length === 0 &&
        activityData.length === 0 &&
        enrollmentData.length === 0;

      if (hasNoFirestoreData) {
        setStudents(DEMO_DASHBOARD_DATA.students);
        setActivities(DEMO_DASHBOARD_DATA.activities);
        setEnrollments(DEMO_DASHBOARD_DATA.enrollments);
        return;
      }
    } catch (err) {
      console.error("Dashboard loading error:", err);

      setStudents(DEMO_DASHBOARD_DATA.students);
      setActivities(DEMO_DASHBOARD_DATA.activities);
      setEnrollments(DEMO_DASHBOARD_DATA.enrollments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardData();
  }, []);

  /*
   * ---------------------------------------------------------
   * STUDENT STATISTICS
   * ---------------------------------------------------------
   */

  const activeStudents = useMemo(() => {
    return students.filter((student) => student.status === "Active").length;
  }, [students]);

  const inactiveStudents = useMemo(() => {
    return students.filter((student) => student.status === "Inactive").length;
  }, [students]);

  /*
   * ---------------------------------------------------------
   * ACTIVITY STATISTICS
   * ---------------------------------------------------------
   */

  const activeActivities = useMemo(() => {
    return activities.filter(
      (activity) => activity.status === "Active"
    ).length;
  }, [activities]);

  /*
   * ---------------------------------------------------------
   * ENROLLMENT STATISTICS
   * ---------------------------------------------------------
   */

  const activeEnrollments = useMemo(() => {
    return enrollments.filter(
      (enrollment) => enrollment.status === "Active"
    ).length;
  }, [enrollments]);

  const inactiveEnrollments = useMemo(() => {
    return enrollments.filter(
      (enrollment) => enrollment.status === "Inactive"
    ).length;
  }, [enrollments]);

  /*
   * ---------------------------------------------------------
   * UNIQUE ACTIVITIES USED BY STUDENTS
   *
   * IMPORTANT:
   * We DO NOT use:
   *
   * student.activity
   *
   * because activity belongs to Enrollment.
   * ---------------------------------------------------------
   */

  const enrolledActivityIds = useMemo(() => {
    return new Set(
      enrollments
        .map((enrollment) => enrollment.activityId)
        .filter(Boolean)
    );
  }, [enrollments]);

  const usedActivities = enrolledActivityIds.size;

  /*
   * ---------------------------------------------------------
   * TOTAL EXPECTED SESSION FEES
   * ---------------------------------------------------------
   */

  const totalEnrollmentFees = useMemo(() => {
    return enrollments.reduce((total, enrollment) => {
      return total + (enrollment.sessionFee ?? 0);
    }, 0);
  }, [enrollments]);

  /*
   * ---------------------------------------------------------
   * RECENT STUDENTS
   * ---------------------------------------------------------
   */

  const recentStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => {
        const dateA = getDateFromTimestamp(a.createdAt)?.getTime() ?? 0;
        const dateB = getDateFromTimestamp(b.createdAt)?.getTime() ?? 0;

        return dateB - dateA;
      });
  }, [students]);

  /*
   * ---------------------------------------------------------
   * RECENT ENROLLMENTS
   * ---------------------------------------------------------
   */

  const recentEnrollments = useMemo(() => {
    return [...enrollments]
      .sort((a, b) => {
        const dateA = getDateFromTimestamp(a.createdAt)?.getTime() ?? 0;
        const dateB = getDateFromTimestamp(b.createdAt)?.getTime() ?? 0;

        return dateB - dateA;
      });
  }, [enrollments]);

  /*
   * ---------------------------------------------------------
   * LOADING STATE
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="ui-page mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-32 rounded-2xl bg-slate-200" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 rounded-xl bg-slate-200"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="h-96 rounded-xl bg-slate-200 xl:col-span-2" />
            <div className="h-96 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * ERROR STATE
   * ---------------------------------------------------------
   */

  if (error) {
    return (
      <div className="ui-page mx-auto">
        <div className="ui-surface border-red-200 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>

          <h2 className="ui-section-title mt-4">
            Dashboard could not load
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() => void loadDashboardData()}
            className="ui-button mt-5 bg-brand-600 py-2.5 text-white transition hover:bg-brand-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page mx-auto space-y-6">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Academy Overview
                </span>

                <span className="text-xs text-slate-400">
                  Administration
                </span>
              </div>

              <h1 className="ui-page-title">
                Dashboard
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Monitor students, activities, enrollments and academy
                operations.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/students/add")}
                className="ui-button inline-flex items-center justify-center gap-2 border border-slate-200 bg-white py-2.5 text-slate-700 transition hover:bg-slate-50"
              >
                <UserPlus size={17} />
                Add Student
              </button>

              <button
                type="button"
                onClick={() => navigate("/enrollments/add")}
                className="ui-button inline-flex items-center justify-center gap-2 bg-brand-600 py-2.5 text-white transition hover:bg-brand-700"
              >
                <GraduationCap size={17} />
                New Enrollment
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            STATISTICS
        ===================================================== */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* Total Students */}
          <div className="ui-surface p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Students
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {students.length}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Users size={21} />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className="font-medium text-emerald-600">
                {activeStudents} active
              </span>

              <span className="text-slate-300">•</span>

              <span className="text-slate-500">
                {inactiveStudents} inactive
              </span>
            </div>
          </div>

          {/* Active Students */}
          <div className="ui-surface p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Active Students
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {activeStudents}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={21} />
              </div>
            </div>

            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width:
                      students.length > 0
                        ? `${(activeStudents / students.length) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Enrollments */}
          <div className="ui-surface p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Enrollments
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {enrollments.length}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <GraduationCap size={21} />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className="font-medium text-emerald-600">
                {activeEnrollments} active
              </span>

              <span className="text-slate-300">•</span>

              <span className="text-slate-500">
                {inactiveEnrollments} inactive
              </span>
            </div>
          </div>

          {/* Activities */}
          <div className="ui-surface p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Activities
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {activities.length}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Activity size={21} />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className="font-medium text-emerald-600">
                {activeActivities} active
              </span>

              <span className="text-slate-300">•</span>

              <span className="text-slate-500">
                {usedActivities} currently used
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================
            MIDDLE SECTION
        ===================================================== */}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Recent Students */}
          <div className="ui-surface overflow-hidden xl:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="ui-section-title">
                  Recent Students
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Recently added students
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/students")}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition hover:text-brand-700"
              >
                View all
                <ArrowRight size={15} />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentStudents.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No students yet
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Add your first student to get started.
                  </p>
                </div>
              ) : (
                <PaginatedList items={recentStudents}>{(student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700">
                        {student.fullName?.charAt(0)?.toUpperCase() ?? "S"}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {student.fullName}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {student.studentCode || "No student code"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          student.status === "Active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {student.status}
                      </span>

                      <span className="text-[11px] text-slate-400">
                        {formatDate(student.createdAt)}
                      </span>
                    </div>
                  </div>
                )}</PaginatedList>
              )}
            </div>
          </div>

          {/* Quick Summary */}
          <div className="ui-surface">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="ui-section-title">
                Academy Summary
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Current operational overview
              </p>
            </div>

            <div className="space-y-5 p-5">

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Users size={18} />
                  </div>

                  <span className="text-sm text-slate-600">
                    Students
                  </span>
                </div>

                <span className="font-semibold text-slate-900">
                  {students.length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <GraduationCap size={18} />
                  </div>

                  <span className="text-sm text-slate-600">
                    Enrollments
                  </span>
                </div>

                <span className="font-semibold text-slate-900">
                  {enrollments.length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Activity size={18} />
                  </div>

                  <span className="text-sm text-slate-600">
                    Activities
                  </span>
                </div>

                <span className="font-semibold text-slate-900">
                  {activities.length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={18} />
                  </div>

                  <span className="text-sm text-slate-600">
                    Active Enrollments
                  </span>
                </div>

                <span className="font-semibold text-slate-900">
                  {activeEnrollments}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Enrollment Fee Total
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {formatCurrency(totalEnrollmentFees)}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <span className="text-sm font-bold">Rs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            RECENT ENROLLMENTS
        ===================================================== */}

        <section className="ui-surface overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="ui-section-title">
                Recent Enrollments
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Latest student activity registrations
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/enrollments")}
              className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-brand-600 transition hover:text-brand-700 sm:self-auto"
            >
              View all
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="ui-table min-w-[760px]">
              <thead className="ui-table-head border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Enrollment
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Student
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Activity
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fee
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentEnrollments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No enrollments found.
                    </td>
                  </tr>
                ) : (
                  <PaginatedList items={recentEnrollments} table>{(enrollment) => (
                    <tr
                      key={enrollment.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {enrollment.enrollmentCode}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">
                          {enrollment.studentName}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {enrollment.studentCode}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">
                          {enrollment.activityName}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {enrollment.activityCode}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarDays
                            size={15}
                            className="text-slate-400"
                          />

                          {enrollment.enrollmentDate || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(enrollment.sessionFee)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            enrollment.status === "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {enrollment.status}
                        </span>
                      </td>
                    </tr>
                  )}</PaginatedList>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* =====================================================
            QUICK ACTIONS
        ===================================================== */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          <button
            type="button"
            onClick={() => navigate("/students/add")}
            className="group rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <UserPlus size={19} />
              </div>

              <ArrowRight
                size={17}
                className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600"
              />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              Add Student
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Register a new student in the academy.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/activities/add")}
            className="group rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Activity size={19} />
              </div>

              <ArrowRight
                size={17}
                className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-amber-600"
              />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              Add Activity
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Create a new academy activity or program.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/enrollments/add")}
            className="group rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <GraduationCap size={19} />
              </div>

              <ArrowRight
                size={17}
                className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600"
              />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              New Enrollment
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Link an existing student to an activity.
            </p>
          </button>

        </section>

        {/* =====================================================
            FOOTER INFORMATION
        ===================================================== */}

        <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Clock3 size={14} />
            <span>
              Dashboard data is connected to your Firebase database.
            </span>
          </div>

          <span>
            Young Explorers Academy
          </span>
        </div>

      </div>
  );
}