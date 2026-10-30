import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { getKathmanduToday, isValidBSDate, normalizeEnrollmentDate } from "@/utils/calendar-date";
import { convertBSToAD } from "@/utils/nepali-date";
import { getStudentById } from "@/features/students/services/student.service";
import {
  addEnrollment, DuplicateEnrollmentError, getActivitiesForEnrollment,
  getEnrollments, getEnrollmentById, setEnrollmentStatus,
} from "@/features/enrollments/services/enrollment.service";
import { getDailyAttendanceByDate, saveBatchAttendance } from "@/features/attendance/services/attendance.service";
import { getAttendanceActor } from "@/features/attendance/services/attendance-recorder.service";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import type { StudentFeeSummary } from "./fee-calculation.service";
import type { BillingSelection } from "./billing-selection.service";

export interface ManualBillingSession { activityId: string; dateBS: string }

export function validateManualBillingSessions(sessions: ManualBillingSession[]) {
  if (!sessions.length) throw new Error("Add at least one activity and session date.");
  if (sessions.length > 50) throw new Error("Add up to 50 sessions at a time.");
  const unique = new Map<string, ManualBillingSession>();
  for (const session of sessions) {
    if (!session.activityId) throw new Error("Select an activity for every session.");
    if (!isValidBSDate(session.dateBS)) throw new Error("Choose a valid Nepali session date for every session.");
    unique.set(JSON.stringify([session.activityId, session.dateBS]), { ...session });
  }
  return [...unique.values()].sort((a, b) => a.dateBS.localeCompare(b.dateBS));
}

/** Only the explicitly entered sessions/months are initially selected for this invoice. */
export function manualBillingSelection(summary: StudentFeeSummary, sessions: ManualBillingSession[]): BillingSelection {
  return Object.fromEntries(summary.lines.map((line) => {
    const dates = new Set(sessions.filter((session) => session.activityId === line.activityId).map((session) => session.dateBS));
    const requestedMonths = new Set([...dates].map((date) => date.slice(0, 7)));
    const months = (line.billedMonths ?? []).filter((month) => requestedMonths.has(month));
    const attendanceDates = (line.attendanceDates ?? []).filter((date) => dates.has(date));
    return [line.enrollmentId, {
      included: line.countedMonthly ? months.length > 0 : attendanceDates.length > 0,
      months, attendanceDates,
    }];
  }));
}

/** Uses the regular enrollment and audited attendance workflows. Each completed
 * step is reusable on retry if a later write or the fee calculation fails. */
export async function saveManualBillingSessions(studentId: string, input: ManualBillingSession[]) {
  if (!studentId) throw new Error("Select a student first.");
  const sessions = validateManualBillingSessions(input);
  const actor = await getAttendanceActor();
  if (actor.role !== "admin") throw new Error("Only administrators can use manual billing.");
  const [student, activities, enrollments] = await Promise.all([
    getStudentById(studentId), getActivitiesForEnrollment(), getEnrollments(),
  ]);
  if (!student) throw new Error("The selected student no longer exists.");
  const activityIds = [...new Set(sessions.map((session) => session.activityId))];
  const selectedEnrollments = new Map<string, Enrollment>();
  // Validate the complete selection before creating enrollment or attendance records.
  for (const activityId of activityIds) {
    const activity = activities.find((item) => item.id === activityId);
    if (!activity || activity.status !== "Active") throw new Error("A selected activity is no longer active. Choose another activity.");
    const matches = enrollments.filter((item) => item.studentId === studentId && item.activityId === activityId);
    if (matches.length > 1) throw new Error(`${activity.activityName} has duplicate enrollments. Resolve them before manual billing.`);
    const enrollment = matches[0];
    const monthly = enrollment?.countedMonthly ?? activity.countedMonthly;
    const fee = Number(monthly
      ? enrollment?.monthlyFee ?? activity.feePerMonth ?? 0
      : enrollment?.sessionFee ?? activity.feePerSession ?? activity.sessionFee ?? activity.fee ?? 0);
    if (!Number.isFinite(fee) || fee < 0 || (monthly && fee === 0)) throw new Error(`Configure a valid fee for ${activity.activityName} first.`);
    if (enrollment) selectedEnrollments.set(activityId, enrollment);
  }
  const dates = [...new Set(sessions.map((session) => session.dateBS))];
  const daily = new Map(await Promise.all(dates.map(async (date) => [date, await getDailyAttendanceByDate(date)] as const)));

  try {
    for (const activityId of activityIds) {
      const firstDate = sessions.find((session) => session.activityId === activityId)!.dateBS;
      let enrollment = selectedEnrollments.get(activityId);
      if (!enrollment) {
        try {
          const id = await addEnrollment({ studentId, activityId, enrollmentDate: firstDate, sessionFee: "", status: "Active" });
          enrollment = await getEnrollmentById(id) ?? undefined;
        } catch (error) {
          if (!(error instanceof DuplicateEnrollmentError)) throw error;
          enrollment = error.enrollment;
        }
      }
      if (!enrollment?.id) throw new Error("Unable to load the enrollment. Please retry.");
      if (enrollment.status !== "Active") await setEnrollmentStatus(enrollment.id, "Active");
      const start = normalizeEnrollmentDate(enrollment.enrollmentDate);
      if (!start || firstDate < start) {
        await updateDoc(doc(db, "enrollments", enrollment.id), { enrollmentDate: firstDate, updatedAt: serverTimestamp() });
      }
      selectedEnrollments.set(activityId, enrollment);
    }

    for (const date of dates) {
      const records: Parameters<typeof saveBatchAttendance>[0] = [];
      for (const session of sessions.filter((item) => item.dateBS === date)) {
        const enrollment = selectedEnrollments.get(session.activityId)!;
        const existing = daily.get(date)?.attendances.find((record) => record.studentId === studentId && record.activityId === session.activityId);
        // A repeat submission must not reset paid amounts, notes or original attribution.
        if (existing?.status === "Present") continue;
        const fee = enrollment.countedMonthly ? 0 : Number(enrollment.sessionFee ?? 0);
        records.push({
          ...existing,
          id: existing?.id || `manual-${encodeURIComponent(JSON.stringify([studentId, session.activityId, date]))}`,
          enrollmentId: enrollment.id!, enrollmentCode: enrollment.enrollmentCode,
          studentId, studentName: student.fullName, studentCode: student.studentCode,
          activityId: session.activityId, activityName: enrollment.activityName, activityCode: enrollment.activityCode,
          sessionDate: convertBSToAD(date), sessionDateBS: date, status: "Present",
          sessionFee: fee, chargeAmount: fee, dueAmount: existing?.billingStatus === "Paid" ? 0 : fee,
          billingStatus: existing?.billingStatus === "Paid" ? "Paid" : fee > 0 ? "Due" : "No Charge",
          notes: existing?.notes || (date > getKathmanduToday().bs ? "Advance session recorded through manual billing" : "Recorded through manual billing"),
        });
      }
      if (records.length) await saveBatchAttendance(records);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unable to save sessions.";
    throw new Error(`${reason} Some records may already be saved. Retry the same selection to finish without adding duplicate sessions.`, { cause: error });
  }
  return { sessions, startMonth: sessions[0].dateBS.slice(0, 7), billingDate: sessions.at(-1)!.dateBS };
}
