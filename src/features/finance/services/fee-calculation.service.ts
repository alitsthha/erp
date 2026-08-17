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

import {
  convertADToBS,
  convertBSToAD,
} from "@/utils/nepali-date";

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
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeBsDate(value?: string): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const year = Number(trimmed.slice(0, 4));
  if (Number.isFinite(year) && year >= 2070 && year <= 2100) {
    return trimmed;
  }

  return convertADToBS(trimmed);
}

function getMonthFromDate(date: string): string {
  if (!date) {
    return "";
  }

  const normalized = normalizeBsDate(date);
  const parts = normalized.split("-");

  if (parts.length < 2) {
    return "";
  }

  return `${parts[0]}-${parts[1]}`;
}

function getNumberOfDaysInBsMonth(bsMonth: string): number {
  if (!bsMonth) {
    return 30;
  }

  const [year, month] = bsMonth.split("-").map(Number);
  if (!year || !month) {
    return 30;
  }

  const adDate = convertBSToAD(`${year}-${String(month).padStart(2, "0")}-01`);
  const [adYear, adMonth, adDay] = adDate.split("-").map(Number);
  const nextMonth = new Date(adYear, adMonth, 1);
  const lastDay = new Date(nextMonth.getTime() - 86400000).getDate();

  return Math.max(1, Number(adDay || lastDay) || 30);
}

function getProrationFactor(enrollmentDate: string, month: string): number {
  const normalizedEnrollmentDate = normalizeBsDate(enrollmentDate);
  if (!normalizedEnrollmentDate || !month) {
    return 1;
  }

  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(getNumberOfDaysInBsMonth(month)).padStart(2, "0")}`;

  const enrollmentMonth = getMonthFromDate(normalizedEnrollmentDate);
  if (enrollmentMonth !== month) {
    if (normalizedEnrollmentDate < monthStart) {
      return 0;
    }

    const totalDays = getNumberOfDaysInBsMonth(month);
    const enrollmentDay = Number(normalizedEnrollmentDate.split("-")[2] || 1);
    const daysRemaining = Math.max(1, totalDays - Math.max(0, enrollmentDay - 1));
    return Math.max(0, Math.min(1, daysRemaining / totalDays));
  }

  const enrollmentDay = Number(normalizedEnrollmentDate.split("-")[2] || 1);
  const totalDays = getNumberOfDaysInBsMonth(month);
  const daysRemaining = Math.max(1, totalDays - Math.max(0, enrollmentDay - 1));

  if (normalizedEnrollmentDate > monthEnd) {
    return 0;
  }

  return Math.max(0, Math.min(1, daysRemaining / totalDays));
}

export function calculateSessionFee(
  monthlyFee: number,
  expectedSessionsPerMonth: number
): number {
  if (monthlyFee <= 0 || expectedSessionsPerMonth <= 0) {
    return 0;
  }

  return roundMoney(monthlyFee / expectedSessionsPerMonth);
}

export function calculateEnrollmentFee(
  enrollment: Enrollment,
  attendedSessions: number,
  month?: string
): StudentFeeLine {
  const monthlyFee = toNumber(enrollment.monthlyFee);
  const expectedFromEnrollment = toNumber(enrollment.expectedSessionsPerMonth);
  let sessionFee = toNumber(enrollment.sessionFee);

  const normalizedMonth = month || "";
  const prorationFactor =
    normalizedMonth && enrollment.enrollmentDate
      ? getProrationFactor(enrollment.enrollmentDate, normalizedMonth)
      : 1;

  if (sessionFee <= 0 && monthlyFee > 0 && expectedFromEnrollment > 0) {
    sessionFee = calculateSessionFee(monthlyFee, expectedFromEnrollment);
  }

  const resolvedExpectedSessions =
    expectedFromEnrollment > 0
      ? expectedFromEnrollment
      : monthlyFee > 0 && sessionFee > 0
        ? Math.max(1, Math.round(monthlyFee / sessionFee))
        : 0;

  const proratedExpectedSessions =
    resolvedExpectedSessions > 0
      ? Math.max(0, resolvedExpectedSessions * prorationFactor)
      : 0;

  const safeAttendance = Math.max(0, Math.floor(toNumber(attendedSessions)));
  const chargeableSessions =
    resolvedExpectedSessions > 0
      ? Math.min(safeAttendance, proratedExpectedSessions)
      : safeAttendance;

  let calculatedAmount = 0;

  if (monthlyFee > 0 && sessionFee <= 0) {
    calculatedAmount = monthlyFee * prorationFactor;
  } else if (resolvedExpectedSessions > 0 && sessionFee > 0) {
    const sessionAmount = chargeableSessions * sessionFee;
    const cappedMonthlyFee = monthlyFee > 0 ? Math.min(monthlyFee * prorationFactor, monthlyFee) : sessionAmount;
    calculatedAmount = monthlyFee > 0 ? Math.min(sessionAmount, cappedMonthlyFee) : sessionAmount;
  } else {
    calculatedAmount = chargeableSessions * sessionFee;
  }

  return {
    enrollmentId: enrollment.id ?? "",
    activityId: toString(enrollment.activityId),
    activityName: toString(enrollment.activityName),
    activityCode: toString(enrollment.activityCode),
    monthlyFee: roundMoney(monthlyFee),
    expectedSessions: Math.max(0, Math.ceil(proratedExpectedSessions)),
    sessionFee: roundMoney(sessionFee),
    attendedSessions: safeAttendance,
    calculatedAmount: roundMoney(calculatedAmount),
  };
}

export async function getStudentEnrollments(studentId: string): Promise<Enrollment[]> {
  if (!studentId) {
    return [];
  }

  const q = query(collection(db, "enrollments"), where("studentId", "==", studentId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((enrollmentDoc) => ({
    id: enrollmentDoc.id,
    ...enrollmentDoc.data(),
  })) as Enrollment[];
}

function mapAttendance(id: string, data: Record<string, unknown>): Attendance {
  const status = data.status === "Present" ? "Present" : "Absent";
  const sessionFee = toNumber(data.sessionFee);
  const chargeAmount = toNumber(data.chargeAmount);
  const dueAmount = toNumber(data.dueAmount);

  const billingStatus =
    data.billingStatus === "Paid" ||
    data.billingStatus === "Due" ||
    data.billingStatus === "No Charge"
      ? data.billingStatus
      : chargeAmount > 0
        ? "Due"
        : "No Charge";

  return {
    id,
    attendanceCode: toString(data.attendanceCode),
    enrollmentId: toString(data.enrollmentId),
    enrollmentCode: toString(data.enrollmentCode),
    studentId: toString(data.studentId),
    studentName: toString(data.studentName),
    studentCode: toString(data.studentCode),
    activityId: toString(data.activityId),
    activityName: toString(data.activityName),
    activityCode: toString(data.activityCode),
    sessionDate: toString(data.sessionDate),
    sessionDateBS: toString(data.sessionDateBS),
    status,
    sessionFee,
    chargeAmount,
    dueAmount,
    billingStatus,
    notes: data.notes ? toString(data.notes) : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function getEnrollmentAttendance(
  enrollmentId: string,
  month: string
): Promise<Attendance[]> {
  if (!enrollmentId || !month) {
    return [];
  }

  const q = query(collection(db, "attendances"), where("enrollmentId", "==", enrollmentId));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((attendanceDoc) =>
      mapAttendance(attendanceDoc.id, attendanceDoc.data() as Record<string, unknown>)
    )
    .filter((attendance) => {
      const date = attendance.sessionDateBS || attendance.sessionDate || "";
      return getMonthFromDate(date) === month && attendance.status === "Present";
    });
}

export async function getStudentAttendanceForMonth(
  studentId: string,
  month: string
): Promise<Attendance[]> {
  if (!studentId || !month) {
    return [];
  }

  const q = query(collection(db, "attendances"), where("studentId", "==", studentId));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((attendanceDoc) =>
      mapAttendance(attendanceDoc.id, attendanceDoc.data() as Record<string, unknown>)
    )
    .filter((attendance) => {
      const date = attendance.sessionDateBS || attendance.sessionDate || "";
      return getMonthFromDate(date) === month && attendance.status === "Present";
    });
}

export async function calculateStudentMonthlyFee(
  studentId: string,
  month: string
): Promise<StudentFeeSummary> {
  const enrollments = await getStudentEnrollments(studentId);
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === "Active");

  const lines: StudentFeeLine[] = [];

  for (const enrollment of activeEnrollments) {
    if (!enrollment.id) {
      continue;
    }

    const attendance = await getEnrollmentAttendance(enrollment.id, month);
    const line = calculateEnrollmentFee(enrollment, attendance.length, month);
    lines.push(line);
  }

  const totalAmount = roundMoney(
    lines.reduce((total, line) => total + line.calculatedAmount, 0)
  );

  const firstEnrollment = activeEnrollments[0];

  return {
    studentId,
    studentName: firstEnrollment?.studentName ?? "",
    studentCode: firstEnrollment?.studentCode ?? "",
    month,
    lines,
    totalAmount,
  };
}

export async function countPresentSessions(
  enrollmentId: string,
  month: string
): Promise<number> {
  const attendance = await getEnrollmentAttendance(enrollmentId, month);
  return attendance.length;
}

export async function calculateAllStudentMonthlyFees(
  month: string
): Promise<StudentFeeSummary[]> {
  if (!month) {
    return [];
  }

  const snapshot = await getDocs(collection(db, "enrollments"));
  const enrollments = snapshot.docs.map((enrollmentDoc) => ({
    id: enrollmentDoc.id,
    ...enrollmentDoc.data(),
  })) as Enrollment[];

  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === "Active");
  const studentIds = Array.from(new Set(activeEnrollments.map((enrollment) => enrollment.studentId)));

  const results: StudentFeeSummary[] = [];

  for (const studentId of studentIds) {
    const summary = await calculateStudentMonthlyFee(studentId, month);
    results.push(summary);
  }

  return results;
}