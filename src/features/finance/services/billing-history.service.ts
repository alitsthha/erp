import { convertADToBS } from "@/utils/nepali-date";
import type { Attendance } from "@/features/attendance/types/attendance.types";
import type { InvoiceLine } from "../types/invoice.types";

export type BillingRecord = Record<string, unknown> & { id: string };

export function billingMoney(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round((Math.max(0, amount) + Number.EPSILON) * 100) / 100 : 0;
}

/** Dates in older payment records may be AD; compare only normalized BS dates. */
export function billingDateKey(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(value.trim())) return "";
  const [year, month, day] = value.trim().split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > (year < 2070 ? 31 : 32)) return "";
  const padded = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const result = year < 2070 ? convertADToBS(padded) : padded;
  return Number(result.slice(0, 4)) >= 2070 && Number(result.slice(0, 4)) <= 2100 ? result : "";
}

export function receivedBy(value: unknown, cutoff: string): boolean {
  const date = billingDateKey(value);
  return Boolean(date && date <= cutoff);
}

export function availableAdvance(record: BillingRecord, studentId: string, cutoff: string): number {
  if (record.deletedAt || record.studentId !== studentId || record.category !== "Student Fee (Advance)" || !receivedBy(record.incomeDate, cutoff)) return 0;
  return billingMoney(billingMoney(record.amount) - billingMoney(record.appliedAmount));
}

function legacyMonths(invoice: BillingRecord, line: InvoiceLine): string[] {
  const end = String(invoice.billingMonth ?? "");
  if (!/^\d{4}-\d{2}$/.test(end)) return [];
  const [year, month] = end.split("-").map(Number);
  const endIndex = year * 12 + month - 1;
  let start = String(invoice.billingStartMonth ?? invoice.startMonth ?? "");
  // The previous generator started future bills in the month of creation,
  // but did not store that start month. Recover it from the Firestore timestamp.
  const createdAt = invoice.createdAt as { toDate?: () => Date } | undefined;
  if (!start && typeof createdAt?.toDate === "function") {
    const date = createdAt.toDate();
    if (Number.isFinite(date.getTime())) {
      const adDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
      start = billingDateKey(adDate).slice(0, 7);
    }
  }
  const [startYear, startMonth] = start.split("-").map(Number);
  const inferredCount = /^\d{4}-\d{2}$/.test(start) ? endIndex - (startYear * 12 + startMonth - 1) + 1 : 1;
  const count = Math.min(120, Math.max(1, Number(invoice.months) || (line.countedMonthly && line.monthlyFee > 0 ? Math.round((line.monthlyFeeAmount ?? line.amount) / line.monthlyFee) : inferredCount)));
  return Array.from({ length: count }, (_, index) => {
    const value = endIndex - count + 1 + index;
    return `${Math.floor(value / 12)}-${String(value % 12 + 1).padStart(2, "0")}`;
  });
}

/** Reserve billed fee events, regardless of whether their invoice is paid yet. */
export function billedEnrollmentCharges(
  enrollmentId: string,
  activityId: string,
  invoices: BillingRecord[],
  attendance: Attendance[],
) {
  const months = new Set<string>();
  const attendanceIds = new Set<string>();
  const attendanceDates = new Set<string>();
  const legacySessionLines: { count: number; months: string[] }[] = [];
  for (const invoice of invoices) {
    if (invoice.deletedAt || invoice.status === "Cancelled") continue;
    for (const line of (Array.isArray(invoice.lines) ? invoice.lines : []) as InvoiceLine[]) {
      if (line.enrollmentId ? line.enrollmentId !== enrollmentId : !activityId || line.activityId !== activityId) continue;
      if (line.countedMonthly) {
        for (const month of line.billedMonths ?? legacyMonths(invoice, line)) months.add(month);
      } else if (line.attendanceIds || line.attendanceDates) {
        for (const date of line.attendanceDates ?? []) attendanceDates.add(date);
        for (const id of line.attendanceIds ?? []) attendanceIds.add(id);
      } else {
        legacySessionLines.push({ count: Math.max(0, Math.floor(line.sessionCount || 0)), months: legacyMonths(invoice, line) });
      }
    }
  }
  // Old invoices saved a session count, not attendance IDs. Match the oldest
  // sessions in their stored period once, then use exact IDs for all new bills.
  const sortedAttendance = [...attendance].sort((a, b) =>
    billingDateKey(a.sessionDateBS || a.sessionDate).localeCompare(billingDateKey(b.sessionDateBS || b.sessionDate)) || (a.id ?? "").localeCompare(b.id ?? "")
  );
  for (const item of sortedAttendance) {
    if (item.id && attendanceIds.has(item.id)) attendanceDates.add(billingDateKey(item.sessionDateBS || item.sessionDate));
  }
  for (const legacy of legacySessionLines) {
    for (const item of sortedAttendance) {
      if (legacy.count <= 0) break;
      const date = billingDateKey(item.sessionDateBS || item.sessionDate);
      if (item.id && !attendanceDates.has(date) && legacy.months.includes(date.slice(0, 7))) {
        attendanceIds.add(item.id);
        attendanceDates.add(date);
        legacy.count--;
      }
    }
  }
  return { months, attendanceIds, attendanceDates };
}

export function summarizeBillingHistory(studentId: string, cutoff: string, invoices: BillingRecord[], payments: BillingRecord[], advances: BillingRecord[]) {
  let previousInvoiceTotal = 0;
  let paidThroughDate = 0;
  let previousBalance = 0;
  for (const invoice of invoices) {
    if (invoice.studentId !== studentId || invoice.deletedAt || invoice.status === "Cancelled" || !receivedBy(invoice.invoiceDate, cutoff)) continue;
    const advance = billingMoney(invoice.advanceApplied);
    // Older invoices deducted advances from totalAmount instead of recording
    // them in paidAmount. Reconstruct their gross total for the account summary.
    const total = billingMoney(invoice.totalAmount) + (invoice.advanceIncludedInPaidAmount ? 0 : advance);
    const receipts = payments.filter((payment) => payment.invoiceId === invoice.id && !payment.deletedAt && payment.status !== "cancelled" && payment.status !== "pending" && receivedBy(payment.paymentDate, cutoff));
    const paid = billingMoney(advance + receipts.reduce((sum, payment) => sum + billingMoney(payment.amount), 0));
    previousInvoiceTotal += total;
    paidThroughDate += paid;
    previousBalance += Math.max(total - paid, 0);
  }
  return {
    previousInvoiceTotal: billingMoney(previousInvoiceTotal),
    paidThroughDate: billingMoney(paidThroughDate),
    previousBalance: billingMoney(previousBalance),
    availableAdvance: billingMoney(advances.reduce((sum, record) => sum + availableAdvance(record, studentId, cutoff), 0)),
  };
}
