import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import type {
  Enrollment,
} from "@/features/enrollments/types/enrollment.types";

import type {
  Attendance,
} from "@/features/attendance/types/attendance.types";

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

function toNumber(
  value: unknown
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function toString(
  value: unknown
): string {
  return typeof value === "string"
    ? value
    : "";
}

function roundMoney(
  value: number
): number {
  return (
    Math.round(
      (value + Number.EPSILON) * 100
    ) / 100
  );
}

/* =========================================================
   GET MONTH FROM BS DATE
========================================================= */

function getMonthFromDate(
  date: string
): string {
  if (!date) {
    return "";
  }

  const parts =
    date.split("-");

  if (parts.length < 2) {
    return "";
  }

  return `${parts[0]}-${parts[1]}`;
}

/* =========================================================
   CALCULATE SESSION FEE
========================================================= */

export function calculateSessionFee(
  monthlyFee: number,
  expectedSessionsPerMonth: number
): number {
  if (
    monthlyFee <= 0 ||
    expectedSessionsPerMonth <= 0
  ) {
    return 0;
  }

  return roundMoney(
    monthlyFee /
      expectedSessionsPerMonth
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
    toNumber(
      enrollment.monthlyFee
    );

  const expectedSessions =
    toNumber(
      enrollment.expectedSessionsPerMonth
    );

  let sessionFee =
    toNumber(
      enrollment.sessionFee
    );

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

  const sessionAmount =
    safeAttendance *
    sessionFee;

  /*
   * Never charge more than
   * configured monthly fee.
   */
  const calculatedAmount =
    monthlyFee > 0
      ? Math.min(
          sessionAmount,
          monthlyFee
        )
      : sessionAmount;

  return {
    enrollmentId:
      enrollment.id ?? "",

    activityId:
      toString(
        enrollment.activityId
      ),

    activityName:
      toString(
        enrollment.activityName
      ),

    activityCode:
      toString(
        enrollment.activityCode
      ),

    monthlyFee:
      roundMoney(
        monthlyFee
      ),

    expectedSessions:
      Math.max(
        0,
        Math.floor(
          expectedSessions
        )
      ),

    sessionFee:
      roundMoney(
        sessionFee
      ),

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
      id:
        enrollmentDoc.id,

      ...enrollmentDoc.data(),
    })
  ) as Enrollment[];
}

/* =========================================================
   MAP ATTENDANCE
========================================================= */

function mapAttendance(
  id: string,
  data: Record<string, unknown>
): Attendance {
  const status =
    data.status === "Present"
      ? "Present"
      : "Absent";

  const sessionFee =
    toNumber(
      data.sessionFee
    );

  const chargeAmount =
    toNumber(
      data.chargeAmount
    );

  const dueAmount =
    toNumber(
      data.dueAmount
    );

  const billingStatus =
    data.billingStatus ===
      "Paid" ||
    data.billingStatus ===
      "Due" ||
    data.billingStatus ===
      "No Charge"
      ? data.billingStatus
      : chargeAmount > 0
        ? "Due"
        : "No Charge";

  return {
    id,

    attendanceCode:
      toString(
        data.attendanceCode
      ),

    enrollmentId:
      toString(
        data.enrollmentId
      ),

    enrollmentCode:
      toString(
        data.enrollmentCode
      ),

    studentId:
      toString(
        data.studentId
      ),

    studentName:
      toString(
        data.studentName
      ),

    studentCode:
      toString(
        data.studentCode
      ),

    activityId:
      toString(
        data.activityId
      ),

    activityName:
      toString(
        data.activityName
      ),

    activityCode:
      toString(
        data.activityCode
      ),

    sessionDate:
      toString(
        data.sessionDate
      ),

    sessionDateBS:
      toString(
        data.sessionDateBS
      ),

    status,

    sessionFee,

    chargeAmount,

    dueAmount,

    billingStatus,

    notes:
      data.notes
        ? toString(data.notes)
        : undefined,

    createdAt:
      data.createdAt,

    updatedAt:
      data.updatedAt,
  };
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
        mapAttendance(
          attendanceDoc.id,
          attendanceDoc.data() as Record<
            string,
            unknown
          >
        )
    );

  return attendanceList.filter(
    (attendance) => {
      const date =
        attendance.sessionDateBS ||
        attendance.sessionDate ||
        "";

      return (
        getMonthFromDate(date) ===
          month &&
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
  const enrollments =
    await getStudentEnrollments(
      studentId
    );

  const activeEnrollments =
    enrollments.filter(
      (enrollment) =>
        enrollment.status ===
        "Active"
    );

  const lines:
    StudentFeeLine[] = [];

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
        (total, line) =>
          total +
          line.calculatedAmount,
        0
      )
    );

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
   CALCULATE ALL STUDENTS
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
        id:
          enrollmentDoc.id,

        ...enrollmentDoc.data(),
      })
    ) as Enrollment[];

  const activeEnrollments =
    enrollments.filter(
      (enrollment) =>
        enrollment.status ===
        "Active"
    );

  const studentIds =
    Array.from(
      new Set(
        activeEnrollments.map(
          (enrollment) =>
            enrollment.studentId
        )
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

    results.push(
      summary
    );
  }

  return results;
}