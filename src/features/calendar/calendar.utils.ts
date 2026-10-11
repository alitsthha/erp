import type { Attendance } from "@/features/attendance/types/attendance.types";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import { normalizeEnrollmentDate } from "@/utils/calendar-date";
import { convertBSToAD } from "@/utils/nepali-date";
import type { CalendarEntry, CalendarItem } from "./calendar.types";

export function buildCalendarItems(records: Attendance[], entries: CalendarEntry[]): CalendarItem[] {
  const items: CalendarItem[] = entries.map((entry) => ({ ...entry, automatic: false, records: [] }));
  const classes = new Map(items.filter((item) => item.type === "class")
    .map((item) => [JSON.stringify([item.dateBS, item.activityId]), item]));
  const unique = new Map<string, Attendance>();
  for (const record of records) {
    unique.set(JSON.stringify([record.sessionDateBS, record.activityId, record.studentId || record.enrollmentId || record.id]), record);
  }
  for (const record of unique.values()) {
    if (!record.sessionDateBS || !record.activityId) continue;
    const key = JSON.stringify([record.sessionDateBS, record.activityId]);
    let item = classes.get(key);
    if (!item) {
      item = {
        id: `attendance:${key}`, dateBS: record.sessionDateBS,
        dateAD: convertBSToAD(record.sessionDateBS), type: "class",
        title: record.activityName || "Activity", activityId: record.activityId,
        activityName: record.activityName || "Activity", activityCode: record.activityCode || "",
        time: "", notes: "", automatic: true, records: [],
      };
      classes.set(key, item);
      items.push(item);
    }
    item.records.push(record);
  }
  return items.sort((a, b) => a.dateBS.localeCompare(b.dateBS) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
}

export function verifyClass(item: CalendarItem, enrollments: Enrollment[]) {
  // These are current active enrollments, not a reconstruction of historic enrollment status.
  const eligible = new Set(enrollments.filter((enrollment) => {
    const start = normalizeEnrollmentDate(enrollment.enrollmentDate);
    return enrollment.activityId === item.activityId && enrollment.status === "Active" && start && start <= item.dateBS;
  }).map((enrollment) => enrollment.studentId));
  const recorded = new Set(item.records.map((record) => record.studentId));
  const beforeEnrollment = item.records.filter((record) => {
    const matching = enrollments.filter((enrollment) => enrollment.activityId === item.activityId && enrollment.studentId === record.studentId);
    const starts = matching.map((enrollment) => normalizeEnrollmentDate(enrollment.enrollmentDate));
    return starts.length > 0 && starts.every((start) => start && start > item.dateBS);
  }).length;
  return { eligible: eligible.size, unmarked: [...eligible].filter((id) => !recorded.has(id)).length, beforeEnrollment };
}

export function mergeCalendarAttendance(individual: Attendance[], daily: Attendance[]) {
  // Match Attendance's legacy fallback: summaries are authoritative only on dates without individual records.
  const dates = new Set(individual.map((record) => record.sessionDateBS));
  return [...individual, ...daily.filter((record) => !dates.has(record.sessionDateBS))];
}
