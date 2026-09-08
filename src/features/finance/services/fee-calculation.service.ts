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

  /** True when this enrollment is billed monthly (flat) */
  countedMonthly: boolean;

  /** Enrollment date normalized to BS (`""` when missing or unreadable) */
  enrollmentDate: string;

  monthlyFee: number;
  expectedSessions: number;
  sessionFee: number;

  attendedSessions: number;

  /**
   * BS date inside the billing month on which this enrollment's monthly fee
   * falls due. `""` when no monthly fee is scheduled for that month.
   */
  monthlyDueDate: string;

  /** True when the monthly fee was added to this line */
  monthlyFeeApplied: boolean;

  /** Monthly part of the line (`monthlyFee` when applied, otherwise 0) */
  monthlyFeeAmount: number;

  /** Attendance part of the line (attended sessions × session fee) */
  sessionAmount: number;

  /** Explains why the monthly fee was or was not charged */
  monthlyFeeNote: string;

  /** monthlyFeeAmount + sessionAmount */
  calculatedAmount: number;
}

export interface StudentFeeSummary {
  studentId: string;
  studentName: string;
  studentCode: string;

  /** Billing month in BS (`YYYY-MM`) */
  month: string;

  /** Exact BS billing date used for the monthly due date check (`""` when month level) */
  billingDate: string;

  lines: StudentFeeLine[];

  /** Sum of the monthly fees that fell due on the billing date */
  monthlyFeeTotal: number;

  /** Sum of the attendance based charges */
  sessionFeeTotal: number;

  /** monthlyFeeTotal + sessionFeeTotal */
  totalAmount: number;

  /**
   * Earliest upcoming monthly due date among the enrollments whose monthly fee
   * was not charged. Lets the caller tell the user which billing date to pick.
   */
  nextMonthlyDueDate: string;
}

export interface FeeCalculationOptions {
  /**
   * Exact BS billing date (`YYYY-MM-DD`).
   *
   * When provided, a monthly fee is only charged if that date is the
   * enrollment's monthly due date (the enrollment day of a later month).
   * When omitted the calculation stays at month level and charges a monthly
   * fee whose due date falls anywhere inside the billing month.
   */
  billingDate?: string;
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
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/* =========================================================
   BS DATE HELPERS

   Every helper below is total: an unreadable date produces `""` or a safe
   fallback instead of `NaN`, so a bad record can never leak into an amount.
========================================================= */

const BS_YEAR_MIN = 2070;
const BS_YEAR_MAX = 2100;
const DAY_IN_MS = 86_400_000;
const FALLBACK_DAYS_IN_MONTH = 30;

interface BsDateParts {
  year: number;
  month: number;
  day: number;
}

interface BsMonthParts {
  year: number;
  month: number;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatBsDateParts(parts: BsDateParts): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function formatBsMonthParts(parts: BsMonthParts): string {
  return `${parts.year}-${pad2(parts.month)}`;
}

/**
 * Accepts a BS or AD `YYYY-MM-DD` value and returns it as a padded BS date.
 * Returns `""` when the value cannot be understood.
 */
function normalizeBsDate(value?: string): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    return "";
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 32) {
    return "";
  }

  if (year >= BS_YEAR_MIN && year <= BS_YEAR_MAX) {
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  const converted = convertADToBS(`${year}-${pad2(month)}-${pad2(day)}`);
  return /^\d{4}-\d{2}-\d{2}$/.test(converted) ? converted : "";
}

function parseBsDateParts(value?: string): BsDateParts | null {
  const normalized = normalizeBsDate(value);
  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split("-").map(Number);
  return { year, month, day };
}

/** Parses either `YYYY-MM` or a full date into its BS year/month. */
function parseBsMonthParts(value?: string): BsMonthParts | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (/^\d{4}-\d{1,2}$/.test(trimmed)) {
    const [year, month] = trimmed.split("-").map(Number);

    if (year < BS_YEAR_MIN || year > BS_YEAR_MAX || month < 1 || month > 12) {
      return null;
    }

    return { year, month };
  }

  const date = parseBsDateParts(trimmed);
  return date ? { year: date.year, month: date.month } : null;
}

function getMonthKey(value?: string): string {
  const parts = parseBsMonthParts(value);
  return parts ? formatBsMonthParts(parts) : "";
}

function getMonthIndex(parts: BsMonthParts): number {
  return parts.year * 12 + (parts.month - 1);
}

function addBsMonths(parts: BsMonthParts, count: number): BsMonthParts {
  const index = getMonthIndex(parts) + count;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * Number of days in a BS month, derived from the AD distance between the first
 * day of that month and the first day of the next one.
 */
export function getDaysInBsMonth(year: number, month: number): number {
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return FALLBACK_DAYS_IN_MONTH;
  }

  try {
    const next = addBsMonths({ year, month }, 1);

    const start = Date.parse(
      `${convertBSToAD(`${year}-${pad2(month)}-01`)}T00:00:00Z`
    );

    const end = Date.parse(
      `${convertBSToAD(`${next.year}-${pad2(next.month)}-01`)}T00:00:00Z`
    );

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return FALLBACK_DAYS_IN_MONTH;
    }

    const days = Math.round((end - start) / DAY_IN_MS);

    return days >= 28 && days <= 33 ? days : FALLBACK_DAYS_IN_MONTH;
  } catch (error) {
    console.error("Failed to resolve the length of a BS month:", error);
    return FALLBACK_DAYS_IN_MONTH;
  }
}

/**
 * BS date inside `month` on which an enrollment's monthly fee falls due.
 *
 * The cycle repeats on the enrollment day of every following month, so a
 * student enrolled on 2082-05-10 is charged on 2082-06-10, 2082-07-10 and so
 * on. Months shorter than the enrollment day are clamped to their last day.
 *
 * Returns `""` for the enrollment month itself, because the first monthly fee
 * is only due one month after the enrollment day.
 */
export function getMonthlyDueDateForMonth(
  enrollmentDate: string,
  month: string
): string {
  const enrollment = parseBsDateParts(enrollmentDate);
  const target = parseBsMonthParts(month);

  if (!enrollment || !target) {
    return "";
  }

  if (getMonthIndex(target) <= getMonthIndex(enrollment)) {
    return "";
  }

  const daysInMonth = getDaysInBsMonth(target.year, target.month);
  const day = Math.min(Math.max(enrollment.day, 1), daysInMonth);

  return formatBsDateParts({ year: target.year, month: target.month, day });
}

/**
 * First monthly due date on or after `fromDate`.
 * Falls back to the very first due date when `fromDate` is missing.
 */
export function getNextMonthlyDueDate(
  enrollmentDate: string,
  fromDate?: string
): string {
  const enrollment = parseBsDateParts(enrollmentDate);
  if (!enrollment) {
    return "";
  }

  const enrollmentKey = formatBsDateParts(enrollment);
  const firstDueMonth = addBsMonths(enrollment, 1);
  const from = parseBsDateParts(fromDate);

  let cursor = firstDueMonth;
  if (from && getMonthIndex(from) > getMonthIndex(firstDueMonth)) {
    cursor = { year: from.year, month: from.month };
  }

  const fromKey = from ? formatBsDateParts(from) : "";

  /* At most two months are needed: the cursor month, then the next one when
     the due day of the cursor month has already passed. */
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const dueDate = getMonthlyDueDateForMonth(
      enrollmentKey,
      formatBsMonthParts(cursor)
    );

    if (dueDate && (!fromKey || dueDate >= fromKey)) {
      return dueDate;
    }

    cursor = addBsMonths(cursor, 1);
  }

  return "";
}

interface ResolvedBillingPeriod {
  month: string;
  billingDate: string;
}

/**
 * Resolves the billing month and the exact billing date from the values a
 * caller supplied. `period` may be a `YYYY-MM` month or a full date.
 */
function resolveBillingPeriod(
  period?: string,
  billingDate?: string
): ResolvedBillingPeriod {
  const explicitDate = normalizeBsDate(billingDate);
  if (explicitDate) {
    return { month: getMonthKey(explicitDate), billingDate: explicitDate };
  }

  const periodDate = normalizeBsDate(period);
  if (periodDate) {
    return { month: getMonthKey(periodDate), billingDate: periodDate };
  }

  return { month: getMonthKey(period), billingDate: "" };
}

/* =========================================================
   FEE CALCULATION
========================================================= */

export function calculateSessionFee(
  monthlyFee: number,
  expectedSessionsPerMonth: number
): number {
  const fee = toNumber(monthlyFee);
  const sessions = toNumber(expectedSessionsPerMonth);

  if (fee <= 0 || sessions <= 0) {
    return 0;
  }

  return roundMoney(fee / sessions);
}

export function calculateEnrollmentFee(
  enrollment: Enrollment,
  attendedSessions: number,
  month?: string,
  options?: FeeCalculationOptions
): StudentFeeLine {
  const countedMonthly = Boolean(enrollment.countedMonthly);
  const monthlyFee = roundMoney(Math.max(0, toNumber(enrollment.monthlyFee)));

  const expectedFromEnrollment = Math.max(
    0,
    Math.floor(toNumber(enrollment.expectedSessionsPerMonth))
  );

  let sessionFee = Math.max(0, toNumber(enrollment.sessionFee));

  // If session fee is missing but monthly + expected sessions exist, derive it
  if (sessionFee <= 0 && monthlyFee > 0 && expectedFromEnrollment > 0) {
    sessionFee = calculateSessionFee(monthlyFee, expectedFromEnrollment);
  }

  sessionFee = roundMoney(sessionFee);

  const attended = Math.max(0, Math.floor(toNumber(attendedSessions)));
  const attendanceAmount = roundMoney(attended * sessionFee);

  const enrollmentDate = normalizeBsDate(enrollment.enrollmentDate);

  const { month: billingMonth, billingDate } = resolveBillingPeriod(
    month,
    options?.billingDate
  );

  let monthlyDueDate = "";
  let monthlyFeeApplied = false;
  let monthlyFeeAmount = 0;
  let sessionAmount = 0;
  let monthlyFeeNote = "";

  if (!countedMonthly) {
    // Session mode: charge every present session
    sessionAmount = attendanceAmount;
    monthlyFeeNote = "Charged per attended session.";
  } else if (monthlyFee <= 0) {
    // Monthly mode without a configured fee: fall back to attendance
    sessionAmount = attendanceAmount;
    monthlyFeeNote =
      "No monthly fee is configured, so attended sessions were charged instead.";
  } else if (!enrollmentDate) {
    monthlyFeeNote =
      "Monthly fee not charged: the enrollment date is missing or unreadable.";
  } else if (!billingMonth) {
    monthlyFeeNote =
      "Monthly fee not charged: the billing date is missing or unreadable.";
  } else {
    monthlyDueDate = getMonthlyDueDateForMonth(enrollmentDate, billingMonth);

    if (!monthlyDueDate) {
      const firstDueDate = getNextMonthlyDueDate(enrollmentDate);

      monthlyFeeNote = firstDueDate
        ? `Monthly fee not charged: the first monthly cycle starts on ${firstDueDate}.`
        : "Monthly fee not charged: the monthly cycle could not be resolved.";
    } else if (!billingDate) {
      // Month level billing: the due date falls inside the billing month
      monthlyFeeApplied = true;
      monthlyFeeAmount = monthlyFee;
      monthlyFeeNote = `Monthly fee charged for the cycle due on ${monthlyDueDate}.`;
    } else if (billingDate === monthlyDueDate) {
      monthlyFeeApplied = true;
      monthlyFeeAmount = monthlyFee;
      monthlyFeeNote = `Monthly fee charged: the billing date matches the due date ${monthlyDueDate}.`;
    } else {
      monthlyFeeNote = `Monthly fee not charged: it is due on ${monthlyDueDate}, but ${billingDate} was selected.`;
    }
  }

  // Expected sessions, for reporting only
  const expectedSessions =
    expectedFromEnrollment > 0
      ? expectedFromEnrollment
      : monthlyFee > 0 && sessionFee > 0
        ? Math.max(1, Math.round(monthlyFee / sessionFee))
        : 0;

  return {
    enrollmentId: enrollment.id ?? "",
    activityId: toString(enrollment.activityId),
    activityName: toString(enrollment.activityName),
    activityCode: toString(enrollment.activityCode),
    countedMonthly,
    enrollmentDate,
    monthlyFee,
    expectedSessions,
    sessionFee,
    attendedSessions: attended,
    monthlyDueDate,
    monthlyFeeApplied,
    monthlyFeeAmount: roundMoney(monthlyFeeAmount),
    sessionAmount: roundMoney(sessionAmount),
    monthlyFeeNote,
    calculatedAmount: roundMoney(monthlyFeeAmount + sessionAmount),
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
  const monthKey = getMonthKey(month);

  if (!enrollmentId || !monthKey) {
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
      return getMonthKey(date) === monthKey && attendance.status === "Present";
    });
}

export async function getStudentAttendanceForMonth(
  studentId: string,
  month: string
): Promise<Attendance[]> {
  const monthKey = getMonthKey(month);

  if (!studentId || !monthKey) {
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
      return getMonthKey(date) === monthKey && attendance.status === "Present";
    });
}

export async function calculateStudentMonthlyFee(
  studentId: string,
  period: string,
  options?: FeeCalculationOptions
): Promise<StudentFeeSummary> {
  const { month, billingDate } = resolveBillingPeriod(period, options?.billingDate);

  const enrollments = await getStudentEnrollments(studentId);
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === "Active");

  const lines: StudentFeeLine[] = [];

  for (const enrollment of activeEnrollments) {
    if (!enrollment.id) {
      continue;
    }

    const attendance = month
      ? await getEnrollmentAttendance(enrollment.id, month)
      : [];

    lines.push(
      calculateEnrollmentFee(enrollment, attendance.length, month, { billingDate })
    );
  }

  const monthlyFeeTotal = roundMoney(
    lines.reduce((total, line) => total + line.monthlyFeeAmount, 0)
  );

  const sessionFeeTotal = roundMoney(
    lines.reduce((total, line) => total + line.sessionAmount, 0)
  );

  const totalAmount = roundMoney(monthlyFeeTotal + sessionFeeTotal);

  const upcomingDueDates = lines
    .filter(
      (line) =>
        line.countedMonthly && line.monthlyFee > 0 && !line.monthlyFeeApplied
    )
    .map((line) =>
      getNextMonthlyDueDate(line.enrollmentDate, billingDate || `${month}-01`)
    )
    .filter(Boolean)
    .sort();

  const firstEnrollment = activeEnrollments[0];

  return {
    studentId,
    studentName: firstEnrollment?.studentName ?? "",
    studentCode: firstEnrollment?.studentCode ?? "",
    month,
    billingDate,
    lines,
    monthlyFeeTotal,
    sessionFeeTotal,
    totalAmount,
    nextMonthlyDueDate: upcomingDueDates[0] ?? "",
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
  period: string,
  options?: FeeCalculationOptions
): Promise<StudentFeeSummary[]> {
  if (!period) {
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
    const summary = await calculateStudentMonthlyFee(studentId, period, options);
    results.push(summary);
  }

  return results;
}
