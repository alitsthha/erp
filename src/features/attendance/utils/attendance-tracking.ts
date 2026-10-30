import { isEnrollmentActiveOn } from "@/features/enrollments/utils/enrollment-eligibility";
import type { Attendance } from "../types/attendance.types";
import type { Enrollment } from "../../enrollments/types/enrollment.types";
import { normalizeEnrollmentDate } from "@/utils/calendar-date";

// Stored BS dates are authoritative; normalize legacy AD-only records before grouping.
export function attendanceDateBS(record: Pick<Attendance, "sessionDateBS" | "sessionDate">) {
  return normalizeEnrollmentDate(record.sessionDateBS || record.sessionDate) || "";
}

export function attendanceInBSMonth(records: Attendance[], month: string) {
  return records.filter((record) => attendanceDateBS(record).slice(0, 7) === month);
}

// Callers supply records and enrollments already limited to the user's activities.
export function getAttendedClasses(records: Attendance[], activityId = "all", month?: string) {
  const history: Record<string, Attendance[]> = {};
  const seen = new Set<string>();

  for (const record of records) {
    if (record.status !== "Present" || !record.studentId ||
      (activityId !== "all" && record.activityId !== activityId)) continue;

    const date = attendanceDateBS(record);
    if (!date || (month && date.slice(0, 7) !== month)) continue;
    const key = JSON.stringify([record.studentId, record.activityId, date]);
    if (seen.has(key)) continue;
    seen.add(key);
    (history[record.studentId] ??= []).push(record);
  }

  for (const sessions of Object.values(history)) {
    sessions.sort((a, b) =>
      attendanceDateBS(b).localeCompare(attendanceDateBS(a)) ||
      a.activityName.localeCompare(b.activityName)
    );
  }
  return history;
}

export function getUnrecordedActivities(enrollments: Enrollment[], records: Attendance[], dateBS: string) {
  const recordedIds = new Set(
    records.filter((record) => (record.sessionDateBS || record.sessionDate) === dateBS)
      .map((record) => record.activityId)
  );
  const activities = new Map<string, { id: string; name: string }>();
  for (const enrollment of enrollments) {
    if (!isEnrollmentActiveOn(enrollment, dateBS) || !enrollment.activityId ||
      recordedIds.has(enrollment.activityId)) continue;
    activities.set(enrollment.activityId, { id: enrollment.activityId, name: enrollment.activityName });
  }
  return [...activities.values()].sort((a, b) => a.name.localeCompare(b.name));
}
