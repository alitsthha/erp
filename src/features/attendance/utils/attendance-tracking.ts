import type { Attendance } from "../types/attendance.types";
import type { Enrollment } from "../../enrollments/types/enrollment.types";

// Callers supply records and enrollments already limited to the user's activities.
export function getAttendedClasses(records: Attendance[], activityId = "all") {
  const history: Record<string, Attendance[]> = {};
  const seen = new Set<string>();

  for (const record of records) {
    if (record.status !== "Present" || !record.studentId ||
      (activityId !== "all" && record.activityId !== activityId)) continue;

    const date = record.sessionDateBS || record.sessionDate;
    const key = JSON.stringify([record.studentId, record.activityId, date]);
    if (seen.has(key)) continue;
    seen.add(key);
    (history[record.studentId] ??= []).push(record);
  }

  for (const sessions of Object.values(history)) {
    sessions.sort((a, b) =>
      (b.sessionDateBS || b.sessionDate).localeCompare(a.sessionDateBS || a.sessionDate) ||
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
    if ((enrollment.status && enrollment.status !== "Active") || !enrollment.activityId ||
      (enrollment.enrollmentDate && enrollment.enrollmentDate.slice(0, 10) > dateBS) ||
      recordedIds.has(enrollment.activityId)) continue;
    activities.set(enrollment.activityId, { id: enrollment.activityId, name: enrollment.activityName });
  }
  return [...activities.values()].sort((a, b) => a.name.localeCompare(b.name));
}
