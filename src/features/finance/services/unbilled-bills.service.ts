import type { Student } from "@/features/students/types/student.types";
import { billingDateKey } from "./billing-history.service";
import { calculateAllStudentMonthlyFees, getDaysInBsMonth, getInclusiveBsMonthCount, type BillingPreviewData, type StudentFeeSummary } from "./fee-calculation.service";

function billingMonth(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  // The first four days are the closing billing run for the previous BS month.
  const index = year * 12 + month - 1 - (day <= 4 ? 1 : 0);
  return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`;
}

export function resolveUnbilledBillingPeriod(from: string, to: string) {
  const fromDate = billingDateKey(from);
  const toDate = billingDateKey(to);
  if (!fromDate || !toDate || fromDate > toDate) throw new Error("Select a valid from and to date.");
  const startMonth = billingMonth(fromDate);
  const endMonth = billingMonth(toDate);
  const [year, month] = endMonth.split("-").map(Number);
  const startDate = `${startMonth}-01`;
  const endDate = `${endMonth}-${String(getDaysInBsMonth(year, month)).padStart(2, "0")}`;
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  if ((year - startYear) * 12 + month - startMonthNumber >= 120) throw new Error("Choose a billing period of at most 120 months.");
  return { startMonth, endMonth, startDate, endDate };
}

/** One prospective invoice per current active student, covering complete billing months. */
export async function calculateUnbilledBills(data: BillingPreviewData, from: string, to: string): Promise<StudentFeeSummary[]> {
  const { startMonth, endMonth, endDate } = resolveUnbilledBillingPeriod(from, to);
  const summaries = await calculateAllStudentMonthlyFees(endMonth, {
    startMonth,
    months: getInclusiveBsMonthCount(startMonth, endMonth),
    billingDate: endDate,
    paymentDate: to,
  }, data);
  return summaries.filter((summary) => summary.totalAmount > 0 && data.studentsById.get(summary.studentId)?.status === "Active")
    .map((summary) => {
      const student = data.studentsById.get(summary.studentId)!;
      return { ...summary, studentName: student.fullName, studentCode: student.studentCode };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName) || a.studentId.localeCompare(b.studentId));
}


export interface MissingStudentBill {
  student: Student;
  summary?: StudentFeeSummary;
  billingMonths: string[];
  reason: string;
}

export interface BillingRosterReport {
  totalStudents: number;
  generatedStudents: number;
  pending: MissingStudentBill[];
  readyCount: number;
  reviewCount: number;
  totalAmount: number;
}

/** Reconcile the full current student roster, independently of whether a fee can be calculated. */
export async function calculateBillingRoster(data: BillingPreviewData, from: string, to: string): Promise<BillingRosterReport> {
  const period = resolveUnbilledBillingPeriod(from, to);
  const fromDate = billingDateKey(from);
  const toDate = billingDateKey(to);
  const [year, month] = period.startMonth.split("-").map(Number);
  const first = year * 12 + month - 1;
  const months = Array.from({ length: getInclusiveBsMonthCount(period.startMonth, period.endMonth) }, (_, offset) => {
    const index = first + offset;
    return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`;
  });
  const summaries = new Map((await calculateUnbilledBills(data, from, to)).map((summary) => [summary.studentId, summary]));
  const pending: MissingStudentBill[] = [];
  let generatedStudents = 0;
  for (const student of data.studentsById.values()) {
    const hasBillInRange = (data.invoicesByStudent.get(student.id) ?? []).some((invoice) => {
      if (invoice.deletedAt || invoice.status === "Cancelled") return false;
      const date = billingDateKey(invoice.invoiceDate);
      return !!date && date >= fromDate && date <= toDate;
    });
    if (hasBillInRange) { generatedStudents++; continue; }
    const summary = summaries.get(student.id);
    let reason = "";
    if (!summary) {
      const enrollments = (data.enrollmentsByStudent.get(student.id) ?? []).filter((item) => item.status === "Active");
      const started = enrollments.filter((item) => !billingDateKey(item.enrollmentDate) || billingDateKey(item.enrollmentDate) <= period.endDate);
      if (student.status !== "Active") reason = "Student is inactive.";
      else if (!enrollments.length) reason = "No active enrollment.";
      else if (!started.length) reason = "Enrollment starts after this billing period.";
      else if (started.every((item) => !(Number(item.monthlyFee) > 0 || Number(item.sessionFee) > 0))) reason = "No fee configured.";
      else reason = "No unbilled chargeable sessions or monthly fees found. Check attendance and existing invoice coverage.";
    }
    pending.push({ student, summary, billingMonths: months, reason });
  }
  pending.sort((a, b) => a.student.fullName.localeCompare(b.student.fullName) || a.student.id.localeCompare(b.student.id));
  const readyCount = pending.filter((item) => item.summary).length;
  return {
    totalStudents: data.studentsById.size,
    generatedStudents,
    pending,
    readyCount,
    reviewCount: pending.length - readyCount,
    totalAmount: Math.round(pending.reduce((sum, item) => sum + (item.summary?.totalAmount ?? 0), 0) * 100) / 100,
  };
}
