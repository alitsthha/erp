import type { Attendance } from "@/features/attendance/types/attendance.types";
import { getKathmanduToday } from "@/utils/calendar-date";
import { mergeBillingAttendanceRecords } from "./billing-sessions.service";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";
import { getCurrentBSDate } from "@/utils/nepali-date";
import { billingDateKey } from "./billing-history.service";
import { calculateFinanceSummary, isReceivedPayment, normalizePaymentMethod, outstandingDue, toNumber } from "./finance.service";
import type { FinanceSummary } from "../types/finance.types";

export type FinanceRecord = Record<string, unknown> & { id: string; createdAt?: unknown };
export type FinanceMetric = "income" | "expenses" | "net-profit" | "outstanding" | "cash" | "bank" | "expected-income";
export interface FinanceDetailRow {
  id: string;
  studentId?: string;
  name: string;
  reference: string;
  date: string;
  description: string;
  amount: number;
  activityId?: string;
  activityName?: string;
  invoiceId?: string;
  type: string;
  basis?: "monthly" | "attendance" | "planned";
  sessions?: number;
  attendanceDates?: string[];
}
export interface FinanceOverviewData {
  summary: FinanceSummary;
  expectedIncome: number;
  month: string;
  income: FinanceRecord[];
  expenses: FinanceRecord[];
  invoices: FinanceRecord[];
  payments: FinanceRecord[];
  students: FinanceRecord[];
  enrollments: FinanceRecord[];
  activities: FinanceRecord[];
  attendance: Attendance[];
}
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const text = (value: unknown) => String(value ?? "");
const active = (item: FinanceRecord) => !item.deletedAt && item.status === "Active";
const sum = (rows: FinanceDetailRow[]) => money(rows.reduce((total, row) => total + row.amount, 0));

function activityFor(line: Record<string, unknown>, data: FinanceOverviewData) {
  const enrollment = data.enrollments.find((item) => item.id === line.enrollmentId);
  const id = text(line.activityId || enrollment?.activityId);
  const activity = data.activities.find((item) => item.id === id);
  const name = text(activity?.activityName || line.activityName || enrollment?.activityName);
  return { activityId: id || (name ? `legacy:${name}` : "unassigned"), activityName: name || "Unassigned" };
}

/** Allocate invoice-level payments/discounts proportionally; preserve every cent of the outstanding total. */
function allocatedAmounts(total: number, weights: number[]): number[] {
  const cents = Math.round(total * 100);
  const weightTotal = weights.reduce((value, weight) => value + weight, 0);
  if (!weightTotal) return weights.map((_, index) => index === 0 ? cents / 100 : 0);
  const shares = weights.map((weight) => cents * weight / weightTotal);
  const amounts = shares.map(Math.floor);
  const ranked = shares.map((share, index) => ({ index, fraction: share - amounts[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const remaining = cents - amounts.reduce((value, amount) => value + amount, 0);
  for (let index = 0; index < remaining; index++) amounts[ranked[index].index]++;
  return amounts.map((value) => value / 100);
}

export function expectedIncomeRows(data: FinanceOverviewData, month = data.month): FinanceDetailRow[] {
  const students = new Map(data.students.filter(active).map((item) => [item.id, item]));
  const today = getKathmanduToday().bs;
  const records = data.attendance.filter((item) => item.sessionDateBS.slice(0, 7) === month && item.sessionDateBS <= today);
  const recordedActivities = new Set(records.map((item) => item.activityId));
  return data.enrollments.filter(active).flatMap((enrollment) => {
    const studentId = text(enrollment.studentId);
    const student = students.get(studentId);
    const enrolled = billingDateKey(enrollment.enrollmentDate);
    if (!student || (enrolled && enrolled.slice(0, 7) > month)) return [];
    const plannedSessions = Math.max(0, Math.floor(toNumber(enrollment.expectedSessionsPerMonth)));
    const monthlyFee = Math.max(0, toNumber(enrollment.monthlyFee));
    const rate = Math.max(0, toNumber(enrollment.sessionFee)) || (plannedSessions ? money(monthlyFee / plannedSessions) : 0);
    const hasAttendance = recordedActivities.has(text(enrollment.activityId));
    const attendanceDates = [...new Set(records.filter((item) =>
      item.status === "Present" && (!enrolled || item.sessionDateBS >= enrolled) &&
      (item.enrollmentId ? item.enrollmentId === enrollment.id : item.studentId === studentId && item.activityId === enrollment.activityId)
    ).map((item) => item.sessionDateBS))].sort();
    const basis = enrollment.countedMonthly ? "monthly" : hasAttendance ? "attendance" : "planned";
    const sessions = hasAttendance ? attendanceDates.length : plannedSessions;
    const amount = money(enrollment.countedMonthly ? monthlyFee : hasAttendance || plannedSessions ? sessions * rate : monthlyFee);
    if (!amount && basis !== "attendance") return [];
    const description = basis === "monthly" ? "Flat monthly fee" : basis === "attendance"
      ? `${sessions} attended sessions × Rs. ${rate}`
      : plannedSessions ? `${plannedSessions} expected sessions × Rs. ${rate} (no attendance data)` : "Configured monthly fee (no attendance data)";
    return [{
      id: enrollment.id, studentId, name: text(student.fullName), reference: text(student.studentCode), date: month,
      description, amount, ...activityFor(enrollment, data),
      type: basis === "monthly" ? "Monthly" : basis === "attendance" ? "Recorded attendance" : "Planned — no attendance data",
      basis, sessions: enrollment.countedMonthly ? undefined : sessions, attendanceDates,
    }];
  });
}

export function outstandingRows(data: FinanceOverviewData): FinanceDetailRow[] {
  return data.invoices.flatMap((invoice) => {
    const due = outstandingDue(invoice);
    if (!due) return [];
    const lines = (Array.isArray(invoice.lines) ? invoice.lines : []) as Record<string, unknown>[];
    const groups = new Map<string, { activityId: string; activityName: string; weight: number }>();
    for (const line of lines) {
      const activity = activityFor(line, data);
      const previous = groups.get(activity.activityId);
      const weight = Math.max(0, toNumber(line.amount ?? (toNumber(line.monthlyFeeAmount) + toNumber(line.sessionAmount))));
      groups.set(activity.activityId, { ...activity, weight: (previous?.weight ?? 0) + weight });
    }
    let activities = [...groups.values()];
    if (!activities.some((item) => item.weight > 0)) activities = [{ activityId: "unassigned", activityName: "Unassigned", weight: 1 }];
    const amounts = allocatedAmounts(due, activities.map((item) => item.weight));
    const student = data.students.find((item) => item.id === invoice.studentId);
    return activities.flatMap((activity, index) => amounts[index] ? [{
      id: `${invoice.id}:${activity.activityId}`, invoiceId: invoice.id, studentId: text(invoice.studentId),
      name: text(student?.fullName || invoice.studentName || "Student"), reference: text(invoice.invoiceNumber || invoice.id),
      date: billingDateKey(invoice.invoiceDate), description: `Due: ${text(invoice.dueDate) || "Not set"}`, amount: amounts[index],
      activityId: activity.activityId, activityName: activity.activityName, type: text(invoice.status || "Unpaid"),
    }] : []);
  });
}

function transactionRows(records: FinanceRecord[], type: string, negative = false): FinanceDetailRow[] {
  return records.filter((record) => !record.deletedAt).map((record) => ({
    id: `${type}:${record.id}`, studentId: text(record.studentId),
    name: text(record.studentName || record.source || record.vendor || record.description || type),
    reference: text(record.incomeNumber || record.expenseNumber || record.paymentNumber || record.referenceNumber || record.id),
    date: billingDateKey(record.incomeDate || record.expenseDate || record.paymentDate),
    description: text(record.description || record.category || record.paymentMethod),
    amount: money(toNumber(record.amount ?? record.totalAmount ?? record.paidAmount) * (negative ? -1 : 1)), type,
  }));
}

export function financeDetailRows(data: FinanceOverviewData, metric: FinanceMetric, month = data.month): FinanceDetailRow[] {
  if (metric === "expected-income") return expectedIncomeRows(data, month);
  if (metric === "outstanding") return outstandingRows(data);
  if (metric === "income") return transactionRows(data.income, "Income");
  if (metric === "expenses") return transactionRows(data.expenses, "Expense");
  if (metric === "net-profit") return [...transactionRows(data.income, "Income"), ...transactionRows(data.expenses, "Expense", true)];
  const receipts = data.payments.filter((item) => isReceivedPayment(item) && normalizePaymentMethod(item.accountType ?? item.paymentMethod) === metric);
  return transactionRows(receipts, "Receipt");
}

export function filterFinanceDetailRows(rows: FinanceDetailRow[], activityIds: string[], search = "") {
  const ids = new Set(activityIds);
  const keyword = search.trim().toLowerCase();
  return rows.filter((row) => (!ids.size || ids.has(row.activityId ?? "unassigned")) &&
    (!keyword || `${row.name} ${row.reference} ${row.description} ${row.activityName ?? ""}`.toLowerCase().includes(keyword)));
}

function expectedIncomeAttendance(sources: Record<string, FinanceRecord[]>): Attendance[] {
  const enrollments = new Map((sources.enrollments ?? []).map((item) => [item.id, item]));
  const normalize = (record: Record<string, unknown>, fallbackDate = "") => {
    const enrollment = enrollments.get(text(record.enrollmentId));
    return {
      ...record,
      sessionDateBS: billingDateKey(record.sessionDateBS || record.sessionDate || fallbackDate),
      activityId: text(record.activityId || enrollment?.activityId),
      studentId: text(record.studentId || enrollment?.studentId),
    };
  };
  const individual = (sources.attendances ?? []).map((record) => normalize(record)).filter((record) => record.sessionDateBS);
  const daily = (sources.daily_attendances ?? []).map((day) => {
    const date = billingDateKey(day.sessionDateBS || day.sessionDate);
    return { ...day, sessionDateBS: date, attendances: (Array.isArray(day.attendances) ? day.attendances : [])
      .map((record: Record<string, unknown>) => normalize(record, date)).filter((record) => record.sessionDateBS) };
  });
  return mergeBillingAttendanceRecords(individual as unknown as Attendance[], daily);
}

export function buildFinanceOverviewData(sources: Record<string, FinanceRecord[]>, month = getCurrentBSDate().slice(0, 7)): FinanceOverviewData {
  const data: FinanceOverviewData = {
    summary: calculateFinanceSummary(sources.financeIncome ?? [], sources.financeExpenses ?? [], sources.invoices ?? [], sources.financePayments ?? []),
    expectedIncome: 0, month,
    income: (sources.financeIncome ?? []).filter((item) => !item.deletedAt),
    expenses: (sources.financeExpenses ?? []).filter((item) => !item.deletedAt),
    invoices: (sources.invoices ?? []).filter((item) => !item.deletedAt && String(item.status).toLowerCase() !== "cancelled"),
    payments: (sources.financePayments ?? []).filter(isReceivedPayment),
    students: sources.students ?? [], enrollments: sources.enrollments ?? [], activities: sources.activities ?? [],
    attendance: expectedIncomeAttendance(sources),
  };
  data.expectedIncome = sum(expectedIncomeRows(data));
  return data;
}

export function subscribeFinanceOverview(onChange: (data: FinanceOverviewData) => void, onError: (error: Error) => void): () => void {
  const names = ["financeIncome", "financeExpenses", "invoices", "financePayments", "students", "enrollments", "activities", "attendances", "daily_attendances"];
  const sources: Record<string, FinanceRecord[]> = {};
  let activeSubscription = true;
  let queued = false;
  const stops = names.map((name) => onSnapshot(collection(db, name), (snapshot) => {
    sources[name] = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (activeSubscription && names.every((source) => source in sources)) onChange(buildFinanceOverviewData(sources));
    });
  }, (error) => {
    delete sources[name];
    if (activeSubscription) onError(error);
  }));
  return () => { activeSubscription = false; stops.forEach((stop) => stop()); };
}
