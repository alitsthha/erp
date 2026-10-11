import type { Attendance, AttendanceListRow } from "../types/attendance.types";

export interface AttendanceActor { uid: string; name: string }

export function attendanceAudit(actor: AttendanceActor, existing?: Partial<Attendance> | null) {
  return {
    recordedByUserId: existing ? existing.recordedByUserId || "" : actor.uid,
    recordedByName: existing ? existing.recordedByName || "" : actor.name,
    updatedByUserId: actor.uid,
    updatedByName: actor.name,
  };
}

export function getAttendanceTeachers(records: Attendance[]) {
  const teachers = new Map<string, { id: string; name: string; activities: string[] }>();
  for (const record of records) {
    const name = record.updatedByName || record.recordedByName || "Not recorded";
    const id = record.updatedByUserId || record.recordedByUserId || (name === "Not recorded" ? "unknown" : name);
    const teacher = teachers.get(id) || { id, name, activities: [] };
    if (record.activityName && !teacher.activities.includes(record.activityName)) teacher.activities.push(record.activityName);
    teachers.set(id, teacher);
  }
  return [...teachers.values()];
}

export function getActivityClassCounts(row: AttendanceListRow, history: Attendance[]) {
  const sources = row.groupedRecords || [row];
  const activities = new Map(sources.map((record) => [record.activityId, { id: record.activityId, name: record.activityName, dates: new Set<string>() }]));
  for (const record of history) {
    if (record.studentId === row.studentId && record.status === "Present") {
      activities.get(record.activityId)?.dates.add(record.sessionDateBS || record.sessionDate);
    }
  }
  return [...activities.values()].map((activity) => ({ id: activity.id, name: activity.name, count: activity.dates.size }));
}
