import { collection, doc, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { attendanceAudit, getAttendanceChanges, type AttendanceActor } from "../utils/attendance-recorder";
import type { Attendance } from "../types/attendance.types";

const editableFields = ["enrollmentId", "enrollmentCode", "studentId", "studentName", "studentCode", "activityId", "sessionDate", "sessionDateBS", "status", "sessionFee", "chargeAmount", "dueAmount", "billingStatus", "notes"] as const;

/** The record and its history entry commit together. Reading the current record
 * inside the transaction preserves attribution when two people edit it. */
export async function writeAttendanceWithHistory(
  id: string,
  data: Partial<Attendance>,
  actor: AttendanceActor,
  legacyRecord?: Partial<Attendance>,
): Promise<Attendance> {
  const recordRef = doc(db, "attendances", id);
  const eventRef = doc(collection(db, "attendances", id, "auditLogs"));
  return runTransaction(db, async (transaction) => {
    if (auth.currentUser?.uid !== actor.uid) throw new Error("Your session changed. Please sign in again.");
    const snapshot = await transaction.get(recordRef);
    const before = snapshot.exists() ? snapshot.data() as Partial<Attendance> : legacyRecord;
    const patch = Object.fromEntries(editableFields.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]));
    const now = Timestamp.now();
    const next = {
      ...before, ...patch, ...attendanceAudit(actor, before),
      attendanceCode: before?.attendanceCode || data.attendanceCode || "",
      createdAt: before?.createdAt || now,
      updatedAt: now,
    } as Attendance;
    // Legacy activity labels may be retained in existing documents; readers
    // resolve their current names by activityId as usual.
    const payload = { ...patch, ...attendanceAudit(actor, before), attendanceCode: next.attendanceCode, createdAt: next.createdAt, updatedAt: now };
    if (snapshot.exists()) transaction.update(recordRef, payload);
    else transaction.set(recordRef, payload);
    const changes = getAttendanceChanges(before || null, next);
    transaction.set(eventRef, {
      action: before ? changes.length ? "updated" : "saved" : "created",
      actor: { uid: actor.uid, name: actor.name, email: actor.email || "", role: actor.role || "", staffId: actor.staffId || "" },
      changes, createdAt: serverTimestamp(),
    });
    return { ...next, id };
  });
}

