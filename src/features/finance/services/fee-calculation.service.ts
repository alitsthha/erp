import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import type { Attendance } from "@/features/attendance/types/attendance.types";

/* =========================================================
   TYPES
========================================================= */

export interface StudentFeeLine {
  enrollmentId: string;

  activityId: string;
  activityName: string;
  activityCode: string;

  monthlyFee: number;
  expectedSessions: number;
  sessionFee: number;

  attendedSessions: number;

  calculatedAmount: number;
}

export interface StudentFeeSummary {
  studentId: string;
  studentName: string;
  studentCode: string;

  month: string;

  lines: StudentFeeLine[];

  totalAmount: number;
}

/* =========================================================
   HELPERS
========================================================= */

function toNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value: number): number {
  return (
    Math.round((value + Number.EPSILON) * 100) / 100
  );
}

function getMonthFromDate(date: string): string {
  if (!date) {
    return "";
  }

  return date.substring(0, 7);
}

/* =========================================================
   ATTENDANCE MAPPER
========================================================= */

function mapAttendance(
  attendanceDoc: {
    id: string;
    data: () => Record<string, unknown>;
  }
): Attendance {
  const data = attendanceDoc.data();

  return {
    id: attendanceDoc.id,

    attendanceCode:
      String(data.attendanceCode ?? ""),

    enrollmentId:
      String(data.enrollmentId ?? ""),

    enrollmentCode:
      String(data.enrollmentCode ?? ""),

    studentId:
      String(data.studentId ?? ""),

    studentName:
      String(data.studentName ?? ""),

    studentCode:
      String(data.studentCode ?? ""),

    activityId:
      String(data.activityId ?? ""),

    activityName:
      String(data.activityName ?? ""),

    activityCode:
      String(data.activityCode ?? ""),

    sessionDate:
      String(data.sessionDate ?? ""),

    sessionDateBS:
      String(data.sessionDateBS ?? ""),

    status:
      data.status === "Present"
        ? "Present"
        : "Absent",

    sessionFee:
      toNumber(data.sessionFee),

    notes:
      String(data.notes ?? ""),

    createdAt:
      data.createdAt,

    updatedAt:
      data.updatedAt,
  };
}

/* =========================================================
   CALCULATE SESSION FEE
========================================================= */

export function calculateSessionFee(
  monthlyFee: number,
  expectedSessionsPerMonth: number
): number {
  const safeMonthlyFee =
    toNumber(monthlyFee);

  const safeExpectedSessions =
    Math.floor(
      toNumber(
        expectedSessionsPerMonth
      )
    );

  if (
    safeMonthlyFee <= 0 ||
    safeExpectedSessions <= 0
  ) {
    return 0;
  }

  return roundMoney(
    safeMonthlyFee /
      safeExpectedSessions
  );
}

/* =========================================================
   CALCULATE ONE ENROLLMENT
========================================================= */

export function calculateEnrollmentFee(
  enrollment: Enrollment,
  attendedSessions: number
): StudentFeeLine {
  const monthlyFee =
    Math.max(
      0,
      roundMoney(
        toNumber(
          enrollment.monthlyFee
        )
      )
    );

  const expectedSessions =
    Math.max(
      0,
      Math.floor(
        toNumber(
          enrollment.expectedSessionsPerMonth
        )
      )
    );

  let sessionFee =
    Math.max(
      0,
      roundMoney(
        toNumber(
          enrollment.sessionFee
        )
      )
    );

  /*
   * If session fee is missing,
   * calculate it automatically.
   */
  if (
    sessionFee <= 0 &&
    monthlyFee > 0 &&
    expectedSessions > 0
  ) {
    sessionFee =
      calculateSessionFee(
        monthlyFee,
        expectedSessions
      );
  }

  const safeAttendance =
    Math.max(
      0,
      Math.floor(
        toNumber(
          attendedSessions
        )
      )
    );

  /*
   * Calculate fee from attended
   * sessions.
   */
  const sessionBasedAmount =
    roundMoney(
      safeAttendance *
        sessionFee
    );

  /*
   * Never charge more than the
   * configured monthly fee.
   */
  const calculatedAmount =
    monthlyFee > 0
      ? Math.min(
          sessionBasedAmount,
          monthlyFee
        )
      : sessionBasedAmount;

  return {
    enrollmentId:
      enrollment.id ?? "",

    activityId:
      enrollment.activityId,

    activityName:
      enrollment.activityName,

    activityCode:
      enrollment.activityCode,

    monthlyFee,

    expectedSessions,

    sessionFee,

    attendedSessions:
      safeAttendance,

    calculatedAmount:
      roundMoney(
        calculatedAmount
      ),
  };
}

/* =========================================================
   GET STUDENT ENROLLMENTS
========================================================= */

export async function getStudentEnrollments(
  studentId: string
): Promise<Enrollment[]> {
  if (!studentId) {
    return [];
  }

  const q = query(
    collection(
      db,
      "enrollments"
    ),
    where(
      "studentId",
      "==",
      studentId
    )
  );

  const snapshot =
    await getDocs(q);

  return snapshot.docs.map(
    (enrollmentDoc) => ({
      id: enrollmentDoc.id,
      ...enrollmentDoc.data(),
    })
  ) as Enrollment[];
}

/* =========================================================
   GET ENROLLMENT ATTENDANCE
========================================================= */

export async function getEnrollmentAttendance(
  enrollmentId: string,
  month: string
): Promise<Attendance[]> {
  if (
    !enrollmentId ||
    !month
  ) {
    return [];
  }

  /*
   * IMPORTANT:
   *
   * Attendance service uses:
   *
   * "attendances"
   *
   * Therefore finance must use
   * exactly the same collection.
   */
  const q = query(
    collection(
      db,
      "attendances"
    ),
    where(
      "enrollmentId",
      "==",
      enrollmentId
    )
  );

  const snapshot =
    await getDocs(q);

  const attendanceList =
    snapshot.docs.map(
      (attendanceDoc) =>
        mapAttendance({
          id: attendanceDoc.id,
          data: () =>
            attendanceDoc.data(),
        })
    );

  /*
   * Only Present attendance
   * belonging to the selected
   * BS month is billable.
   */
  return attendanceList.filter(
    (attendance) => {
      const date =
        attendance.sessionDateBS ||
        attendance.sessionDate ||
        "";

      return (
        getMonthFromDate(
          date
        ) === month &&
        attendance.status ===
          "Present"
      );
    }
  );
}

/* =========================================================
   CALCULATE STUDENT MONTHLY FEE
========================================================= */

export async function calculateStudentMonthlyFee(
  studentId: string,
  month: string
): Promise<StudentFeeSummary> {
  if (
    !studentId ||
    !month
  ) {
    return {
      studentId,
      studentName: "",
      studentCode: "",
      month,
      lines: [],
      totalAmount: 0,
    };
  }

  const enrollments =
    await getStudentEnrollments(
      studentId
    );

  /*
   * Only active enrollments
   * participate in billing.
   */
  const activeEnrollments =
    enrollments.filter(
      (enrollment) =>
        enrollment.status ===
        "Active"
    );

  const lines: StudentFeeLine[] =
    [];

  for (
    const enrollment of
      activeEnrollments
  ) {
    if (!enrollment.id) {
      continue;
    }

    const attendance =
      await getEnrollmentAttendance(
        enrollment.id,
        month
      );

    const line =
      calculateEnrollmentFee(
        enrollment,
        attendance.length
      );

    lines.push(line);
  }

  const totalAmount =
    roundMoney(
      lines.reduce(
        (
          total,
          line
        ) =>
          total +
          line.calculatedAmount,
        0
      )
    );

  /*
   * Enrollment stores a snapshot
   * of the student's information.
   */
  const firstEnrollment =
    activeEnrollments[0];

  return {
    studentId,

    studentName:
      firstEnrollment
        ?.studentName ?? "",

    studentCode:
      firstEnrollment
        ?.studentCode ?? "",

    month,

    lines,

    totalAmount,
  };
}

/* =========================================================
   COUNT PRESENT SESSIONS
========================================================= */

export async function countPresentSessions(
  enrollmentId: string,
  month: string
): Promise<number> {
  const attendance =
    await getEnrollmentAttendance(
      enrollmentId,
      month
    );

  return attendance.length;
}

/* =========================================================
   CALCULATE ALL STUDENT MONTHLY FEES
========================================================= */

export async function calculateAllStudentMonthlyFees(
  month: string
): Promise<StudentFeeSummary[]> {
  if (!month) {
    return [];
  }

  const snapshot =
    await getDocs(
      collection(
        db,
        "enrollments"
      )
    );

  const enrollments =
    snapshot.docs.map(
      (enrollmentDoc) => ({
        id: enrollmentDoc.id,
        ...enrollmentDoc.data(),
      })
    ) as Enrollment[];

  const activeEnrollments =
    enrollments.filter(
      (enrollment) =>
        enrollment.status ===
        "Active"
    );

  /*
   * Get unique students.
   *
   * This is important because one
   * student can have multiple
   * activities.
   */
  const studentIds =
    Array.from(
      new Set(
        activeEnrollments
          .map(
            (enrollment) =>
              enrollment.studentId
          )
          .filter(Boolean)
      )
    );

  const results:
    StudentFeeSummary[] = [];

  for (
    const studentId of
      studentIds
  ) {
    const summary =
      await calculateStudentMonthlyFee(
        studentId,
        month
      );

    results.push(summary);
  }

  return results;
}