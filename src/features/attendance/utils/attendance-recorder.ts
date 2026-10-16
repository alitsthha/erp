import type { Attendance, AttendanceListRow } from "../types/attendance.types";

export interface AttendanceActor { uid: string; name: string; email?: string; role?: string; staffId?: string }

export function attendanceAudit(actor: AttendanceActor, existing?: Partial<Attendance> | null) {
  const originalActor = !existing || existing.recordedByUserId === actor.uid;
  return {
    recordedByUserId: existing ? existing.recordedByUserId || "" : actor.uid,
    recordedByName: originalActor ? actor.name : existing?.recordedByName || "",
    recordedByEmail: originalActor ? actor.email || "" : existing?.recordedByEmail || "",
    recordedByRole: originalActor ? actor.role || "" : existing?.recordedByRole || "",
    recordedByStaffId: originalActor ? actor.staffId || "" : existing?.recordedByStaffId || "",
    updatedByEmail: actor.email || "",
    updatedByRole: actor.role || "",
    updatedByStaffId: actor.staffId || "",
    updatedByUserId: actor.uid,
    updatedByName: actor.name,
  };
}

export function getAttendanceTeachers(records: Attendance[]) {
  const teachers = new Map<string, { id: string; name: string; activities: string[] }>();
  for (const record of records) {
    const name = attendanceActorName(record, "recorded") || attendanceActorName(record, "updated") || "Not recorded";
    const id = record.recordedByUserId || record.updatedByUserId || (name === "Not recorded" ? "unknown" : name);
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


export function attendanceActorName(record: Attendance, source: "recorded" | "updated") {
  const email = source === "recorded" ? record.recordedByEmail : record.updatedByEmail;
  const role = source === "recorded" ? record.recordedByRole : record.updatedByRole;
  const name = source === "recorded" ? record.recordedByName : record.updatedByName;
  return role === "admin" ? email || name || "" : name || email || "";
}

export const attendanceChangeFields = {
  enrollmentId: "Enrollment", enrollmentCode: "Enrollment code",
  studentId: "Student", studentName: "Student name", studentCode: "Student code", activityId: "Activity",
  sessionDate: "Session date", sessionDateBS: "Nepali date", status: "Status",
  sessionFee: "Session fee", chargeAmount: "Charge", dueAmount: "Amount due",
  billingStatus: "Billing status", notes: "Notes",
} as const;

export function getAttendanceChanges(before: Partial<Attendance> | null, after: Partial<Attendance>) {
  return Object.entries(attendanceChangeFields).flatMap(([field]) => {
    const key = field as keyof typeof attendanceChangeFields;
    const numeric = ["sessionFee", "chargeAmount", "dueAmount"].includes(key);
    const previous = numeric ? Number(before?.[key] ?? 0) : String(before?.[key] ?? "");
    const next = numeric ? Number(after[key] ?? 0) : String(after[key] ?? "");
    return previous === next ? [] : [{ field, before: previous, after: next }];
  });
}
