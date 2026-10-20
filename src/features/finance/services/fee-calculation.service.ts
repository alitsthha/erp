import type { Student } from "@/features/students/types/student.types";
import { hydrateActivityReferences } from "@/features/activities/services/activity-reference.service";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { getKathmanduToday } from "@/utils/calendar-date";
import { applyBillingSelection, type BillingSelection } from "./billing-selection.service";
import { getBillingCalendarAttendance, mergeBillingAttendance } from "./billing-sessions.service";
import { billedEnrollmentCharges, billingDateKey, summarizeBillingHistory, type BillingRecord } from "./billing-history.service";

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
  billedMonths?: string[];
  attendanceIds?: string[];
  attendanceDates?: string[];
  /** Calendar attendance across the selected period, including previously billed sessions. */
  takenSessions?: number;
  heldSessions?: number;
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
  /** Fees in the selected period, before removing previously invoiced fees. */
  grossAmount: number;
  previouslyBilledAmount: number;
  previousInvoiceTotal: number;
  paidThroughDate: number;
  previousBalance: number;
  availableAdvance: number;
  studentId: string;
  studentName: string;
  studentCode: string;

  /** Billing month in BS (`YYYY-MM`) */
  month: string;

  /** Inclusive BS cutoff for attendance and payments (`""` for month-end). */
  billingDate: string;

  lines: StudentFeeLine[];

  /** Sum of monthly fees not already reserved by another invoice. */
  monthlyFeeTotal: number;

  /** Sum of the attendance based charges */
  sessionFeeTotal: number;

  /** Newly unbilled monthlyFeeTotal + sessionFeeTotal, before discounts/advances. */
  totalAmount: number;

  /**
   * Earliest upcoming monthly due date among the enrollments whose monthly fee
   * was not charged. Lets the caller tell the user which billing date to pick.
   */
  nextMonthlyDueDate: string;

  /** Number of consecutive BS months included in this calculation. */
  months: number;
}

export interface FeeCalculationOptions {
  /** Invoice issue date used for payment history, independent of the fee period. */
  paymentDate?: string;
  selection?: BillingSelection;
  /**
   * Exact BS billing date (`YYYY-MM-DD`).
   *
   * Attendance and payments after this date are excluded. Monthly fees are
   * charged once per included month. Defaults to month-end when omitted.
   */
  billingDate?: string;

  /** Number of consecutive BS months starting at the billing month. */
  months?: number;

  /** First BS month included in the range. Defaults to the requested month. */
  startMonth?: string;
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

function getBillingMonths(startMonth: string, count: number): string[] {
  const start = parseBsMonthParts(startMonth);
  if (!start) return [];

  const safeCount = Math.min(120, Math.max(1, Math.floor(count) || 1));
  return Array.from({ length: safeCount }, (_, index) =>
    formatBsMonthParts(addBsMonths(start, index))
  );
}

export function getInclusiveBsMonthCount(startMonth: string, endMonth: string): number {
  const start = parseBsMonthParts(startMonth);
  const end = parseBsMonthParts(endMonth);
  if (!start || !end) return 1;
  return Math.min(120, Math.max(1, getMonthIndex(end) - getMonthIndex(start) + 1));
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

  const { month: billingMonth } = resolveBillingPeriod(
    month,
    options?.billingDate
  );

  let monthlyDueDate = "";
  let monthlyFeeApplied = false;
  let monthlyFeeAmount = 0;
  let sessionAmount = 0;
  let monthlyFeeNote: string;

  if (!countedMonthly) {
    // Session mode: charge every present session
    sessionAmount = attendanceAmount;
    monthlyFeeNote = "Charged per attended session.";
  } else if (monthlyFee <= 0) {
    monthlyFeeNote = "Monthly fee not charged: no monthly fee is configured.";
  } else if (!billingMonth) {
    monthlyFeeNote =
      "Monthly fee not charged: the billing month is missing or unreadable.";
  } else {
    monthlyDueDate = enrollmentDate
      ? getMonthlyDueDateForMonth(enrollmentDate, billingMonth)
      : "";
    monthlyFeeApplied = true;
    monthlyFeeAmount = monthlyFee;
    monthlyFeeNote = `Monthly fee charged for ${billingMonth}.`;
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

  return hydrateActivityReferences(snapshot.docs.filter((enrollmentDoc) => !enrollmentDoc.data().deletedAt).map((enrollmentDoc) => ({
    id: enrollmentDoc.id,
    ...enrollmentDoc.data(),
  })) as Enrollment[]);
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

  return hydrateActivityReferences(snapshot.docs
    .map((attendanceDoc) =>
      mapAttendance(attendanceDoc.id, attendanceDoc.data() as Record<string, unknown>)
    )
    .filter((attendance) => {
      const date = attendance.sessionDateBS || attendance.sessionDate || "";
      return getMonthKey(date) === monthKey && attendance.status === "Present";
    }));
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

  return hydrateActivityReferences(snapshot.docs
    .map((attendanceDoc) =>
      mapAttendance(attendanceDoc.id, attendanceDoc.data() as Record<string, unknown>)
    )
    .filter((attendance) => {
      const date = attendance.sessionDateBS || attendance.sessionDate || "";
      return getMonthKey(date) === monthKey && attendance.status === "Present";
    }));
}

/** A workspace-scoped snapshot for previews only. Invoice generation always reads fresh data. */
export interface BillingPreviewData {
  studentsById: Map<string, Student>;
  enrollmentsByStudent: Map<string, Enrollment[]>;
  invoicesByStudent: Map<string, BillingRecord[]>;
  attendanceByEnrollment: Map<string, Attendance[]>;
  calendarAttendance: Attendance[];
}

export async function loadBillingPreviewData(): Promise<BillingPreviewData> {
  const [enrollmentSnapshot, invoiceSnapshot, attendanceSnapshot, dailySnapshot, studentSnapshot] = await Promise.all(
    ["enrollments", "invoices", "attendances", "daily_attendances", "students"].map((name) => getDocs(collection(db, name)))
  );
  return buildBillingPreviewData([enrollmentSnapshot, invoiceSnapshot, attendanceSnapshot, dailySnapshot, studentSnapshot]);
}

async function buildBillingPreviewData([enrollmentSnapshot, invoiceSnapshot, attendanceSnapshot, dailySnapshot, studentSnapshot]: QuerySnapshot<DocumentData>[]): Promise<BillingPreviewData> {
  const studentsById = new Map(studentSnapshot.docs
    .filter((item) => !item.data().deletedAt)
    .map((item) => [item.id, { ...item.data(), id: item.id } as Student]));
  const enrollments = await hydrateActivityReferences(enrollmentSnapshot.docs
    .filter((item) => !item.data().deletedAt)
    .map((item) => ({ ...item.data(), id: item.id }) as Enrollment));
  const enrollmentsByStudent = new Map<string, Enrollment[]>();
  for (const enrollment of enrollments) {
    const items = enrollmentsByStudent.get(enrollment.studentId) ?? [];
    items.push(enrollment);
    enrollmentsByStudent.set(enrollment.studentId, items);
  }
  const invoicesByStudent = new Map<string, BillingRecord[]>();
  for (const item of invoiceSnapshot.docs) {
    const invoice = { ...item.data(), id: item.id } as BillingRecord;
    const studentId = String(invoice.studentId ?? "");
    const items = invoicesByStudent.get(studentId) ?? [];
    items.push(invoice);
    invoicesByStudent.set(studentId, items);
  }
  const attendanceByEnrollment = new Map<string, Attendance[]>();
  for (const item of attendanceSnapshot.docs) {
    if (item.data().deletedAt) continue;
    const attendance = mapAttendance(item.id, item.data());
    if (attendance.status !== "Present") continue;
    const items = attendanceByEnrollment.get(attendance.enrollmentId) ?? [];
    items.push(attendance);
    attendanceByEnrollment.set(attendance.enrollmentId, items);
  }
  const calendarAttendance = await mergeBillingAttendance(
    attendanceSnapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Attendance),
    dailySnapshot.docs.map((item) => item.data()),
  );
  return { studentsById, enrollmentsByStudent, invoicesByStudent, attendanceByEnrollment, calendarAttendance };
}

/** One listener per source: date changes reuse this data; source edits refresh the preview. */
export function subscribeBillingPreviewData(
  onChange: (data: BillingPreviewData) => void,
  onError: (error: Error) => void,
): () => void {
  const names = ["enrollments", "invoices", "attendances", "daily_attendances", "students"];
  const snapshots = new Map<string, QuerySnapshot<DocumentData>>();
  let active = true;
  let version = 0;
  let queued = false;
  const refresh = () => {
    version++;
    if (queued || snapshots.size !== names.length) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      const request = version;
      void buildBillingPreviewData(names.map((name) => snapshots.get(name)!)).then((data) => {
        if (active && request === version) onChange(data);
      }).catch((error: unknown) => {
        if (active && request === version) onError(error instanceof Error ? error : new Error("Unable to refresh unbilled fees."));
      });
    });
  };
  const stops = names.map((name) => onSnapshot(collection(db, name), (snapshot) => {
    if (!active) return;
    snapshots.set(name, snapshot);
    refresh();
  }, (error) => {
    snapshots.delete(name);
    version++;
    if (active) onError(error);
  }));
  return () => { active = false; version++; stops.forEach((stop) => stop()); };
}

export async function calculateStudentMonthlyFee(
  studentId: string,
  period: string,
  options?: FeeCalculationOptions,
  previewData?: BillingPreviewData,
): Promise<StudentFeeSummary> {
  const { month, billingDate } = resolveBillingPeriod(period, options?.billingDate);
  if (!studentId || !month) throw new Error("A student and valid billing period are required.");
  const requestedStart = getMonthKey(options?.startMonth) || month;
  const startMonth = requestedStart > month ? month : requestedStart;
  const billingMonths = getBillingMonths(
    startMonth,
    options?.months ?? getInclusiveBsMonthCount(startMonth, month)
  );

  const cutoff = billingDate || `${month}-${String(getDaysInBsMonth(Number(month.slice(0, 4)), Number(month.slice(5, 7)))).padStart(2, "0")}`;
  const paymentCutoff = billingDateKey(options?.paymentDate) || cutoff;
  let enrollments: Enrollment[];
  let invoices: BillingRecord[];
  let advances: BillingRecord[] = [];
  let payments: BillingRecord[] = [];
  if (previewData) {
    enrollments = previewData.enrollmentsByStudent.get(studentId) ?? [];
    invoices = previewData.invoicesByStudent.get(studentId) ?? [];
  } else {
    const [enrollmentData, invoiceSnapshot, advanceSnapshot] = await Promise.all([
      getStudentEnrollments(studentId),
      getDocs(query(collection(db, "invoices"), where("studentId", "==", studentId))),
      getDocs(query(collection(db, "financeIncome"), where("studentId", "==", studentId))),
    ]);
    enrollments = enrollmentData;
    invoices = invoiceSnapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
    advances = advanceSnapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
    // Query by invoice so legacy receipts without a studentId are included too.
    const paymentSnapshots = await Promise.all(invoices.filter((item) => !item.deletedAt && item.status !== "Cancelled").map((item) =>
      getDocs(query(collection(db, "financePayments"), where("invoiceId", "==", item.id)))
    ));
    payments = paymentSnapshots.flatMap((snapshot) => snapshot.docs.map((item) => ({ ...item.data(), id: item.id })));
  }
  const activeEnrollments = enrollments.filter((enrollment) => {
    const started = normalizeBsDate(enrollment.enrollmentDate);
    return enrollment.status === "Active" && (!started || started <= cutoff);
  });
  const attendanceCutoff = [cutoff, getKathmanduToday().bs].sort()[0];
  const calendarAttendance = previewData
    ? previewData.calendarAttendance.filter((item) => item.sessionDateBS >= `${startMonth}-01` && item.sessionDateBS <= attendanceCutoff)
    : await getBillingCalendarAttendance(`${startMonth}-01`, attendanceCutoff);

  const lines: StudentFeeLine[] = [];
  let grossAmount = 0;

  for (const enrollment of activeEnrollments) {
    if (!enrollment.id) {
      continue;
    }

    const allAttendance = previewData
      ? previewData.attendanceByEnrollment.get(enrollment.id) ?? []
      : (await getDocs(query(collection(db, "attendances"), where("enrollmentId", "==", enrollment.id)))).docs
          .filter((item) => !item.data().deletedAt)
          .map((item) => mapAttendance(item.id, item.data()))
          .filter((item) => item.status === "Present");
    const enrollmentDate = normalizeBsDate(enrollment.enrollmentDate);
    const inPeriod = (item: Attendance) => {
      const date = billingDateKey(item.sessionDateBS || item.sessionDate);
      return Boolean(date && date <= attendanceCutoff && (!enrollmentDate || date >= enrollmentDate)
        && billingMonths.includes(date.slice(0, 7)));
    };
    const calendarRecords = calendarAttendance.filter(inPeriod);
    const studentRecords = calendarRecords.filter((item) => item.enrollmentId
      ? item.enrollmentId === enrollment.id
      : item.studentId === studentId && item.activityId === enrollment.activityId);
    // Include legacy enrollment records without a normalized sessionDateBS field.
    const presentRecords = [...allAttendance.filter(inPeriod), ...studentRecords.filter((item) => item.status === "Present")];
    const byDate = new Map<string, Attendance>();
    for (const item of presentRecords) byDate.set(billingDateKey(item.sessionDateBS || item.sessionDate), item);
    const attendance = [...byDate.values()].sort((a, b) => billingDateKey(a.sessionDateBS || a.sessionDate).localeCompare(billingDateKey(b.sessionDateBS || b.sessionDate)));
    const billed = billedEnrollmentCharges(enrollment.id, enrollment.activityId, invoices, [...allAttendance, ...presentRecords]);
    const unbilledAttendance = attendance.filter((item) => !billed.attendanceDates.has(billingDateKey(item.sessionDateBS || item.sessionDate)));
    const line = calculateEnrollmentFee(enrollment, unbilledAttendance.length, month, { billingDate });
    line.takenSessions = attendance.length;
    // An Absent mark still confirms that the activity took place that day.
    const heldDates = new Set(calendarRecords.filter((item) => item.activityId === enrollment.activityId)
      .map((item) => billingDateKey(item.sessionDateBS || item.sessionDate)));
    for (const date of byDate.keys()) heldDates.add(date);
    line.heldSessions = heldDates.size;
    line.attendanceDates = line.countedMonthly ? [] : unbilledAttendance.map((item) => billingDateKey(item.sessionDateBS || item.sessionDate));
    // A flat monthly fee starts in the enrollment month, never in earlier months.
    const eligibleMonths = billingMonths.filter((value) => !enrollmentDate || value >= enrollmentDate.slice(0, 7));
    grossAmount += line.countedMonthly ? line.monthlyFee * eligibleMonths.length : attendance.length * line.sessionFee;
    line.billedMonths = line.countedMonthly ? eligibleMonths.filter((value) => !billed.months.has(value)) : [];
    line.attendanceIds = line.countedMonthly ? [] : unbilledAttendance.map((item) => item.id!);
    if (line.countedMonthly && line.monthlyFeeAmount > 0) {
      line.monthlyFeeAmount = roundMoney(line.monthlyFeeAmount * line.billedMonths.length);
      line.monthlyFeeApplied = line.monthlyFeeAmount > 0;
      line.calculatedAmount = roundMoney(line.monthlyFeeAmount + line.sessionAmount);
      line.monthlyFeeNote = line.billedMonths.length ? `New monthly fees for ${line.billedMonths.join(", ")}.` : "Monthly fees already invoiced for this period.";
    }
    lines.push(line);
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

  return applyBillingSelection({
    grossAmount: roundMoney(grossAmount),
    previouslyBilledAmount: roundMoney(Math.max(grossAmount - totalAmount, 0)),
    ...summarizeBillingHistory(studentId, paymentCutoff, invoices, payments, advances),
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
    months: billingMonths.length,
  }, options?.selection);
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
  options?: FeeCalculationOptions,
  previewData?: BillingPreviewData,
): Promise<StudentFeeSummary[]> {
  if (!period) {
    return [];
  }

  if (previewData) {
    return Promise.all([...previewData.enrollmentsByStudent.entries()]
      .filter(([, enrollments]) => enrollments.some((enrollment) => enrollment.status === "Active"))
      .map(([studentId]) => calculateStudentMonthlyFee(studentId, period, options, previewData)));
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
