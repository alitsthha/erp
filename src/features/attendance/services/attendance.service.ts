import { writeAttendanceWithHistory } from "./attendance-history.service";
import { withoutActivityLabels } from "@/features/activities/utils/activity-reference";
import { hydrateActivityReferences } from "@/features/activities/services/activity-reference.service";
import {
  collection,
  runTransaction,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import type {
  Attendance,
  AttendanceStatus,
  BillingStatus,
  ActivityAttendanceSummary,
  DailyAttendanceRecord,
} from "@/features/attendance/types/attendance.types";

import {
  generateAttendanceCode,
} from "@/features/attendance/services/attendance-code.service";

import { convertBSToAD } from "@/utils/nepali-date";
import { getAttendanceActor } from "./attendance-recorder.service";
import { type AttendanceActor } from "../utils/attendance-recorder";

const COLLECTION_NAME =
  "attendances";

const DAILY_COLLECTION_NAME =
  "daily_attendances";

/* =========================================================
   HELPERS
========================================================= */

function toString(
  value: unknown
): string {
  return typeof value === "string"
    ? value
    : "";
}

function toNumber(
  value: unknown
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function getAttendanceStatus(
  value: unknown
): AttendanceStatus {
  return value === "Present"
    ? "Present"
    : "Absent";
}

function getBillingStatus(
  value: unknown,
  chargeAmount: number
): BillingStatus {
  if (
    value === "Paid" ||
    value === "Due" ||
    value === "No Charge"
  ) {
    return value;
  }

  return chargeAmount > 0
    ? "Due"
    : "No Charge";
}

/* =========================================================
   MAP FIRESTORE DOCUMENT
========================================================= */

function mapAttendanceDoc(
  id: string,
  data: Record<string, unknown>
): Attendance {
  const sessionFee =
    toNumber(
      data.sessionFee
    );

  const chargeAmount =
    toNumber(
      data.chargeAmount
    );

  const dueAmount =
    toNumber(
      data.dueAmount
    );

  return {
    id,
    recordedByUserId: toString(data.recordedByUserId),
    recordedByName: toString(data.recordedByName),
    updatedByUserId: toString(data.updatedByUserId),
    updatedByName: toString(data.updatedByName),
    recordedByEmail: toString(data.recordedByEmail),
    recordedByRole: toString(data.recordedByRole),
    recordedByStaffId: toString(data.recordedByStaffId),
    updatedByEmail: toString(data.updatedByEmail),
    updatedByRole: toString(data.updatedByRole),
    updatedByStaffId: toString(data.updatedByStaffId),

    attendanceCode:
      toString(
        data.attendanceCode
      ),

    enrollmentId:
      toString(
        data.enrollmentId
      ),

    enrollmentCode:
      toString(
        data.enrollmentCode
      ),

    studentId:
      toString(
        data.studentId
      ),

    studentName:
      toString(
        data.studentName
      ),

    studentCode:
      toString(
        data.studentCode
      ),

    activityId:
      toString(
        data.activityId
      ),

    activityName:
      toString(
        data.activityName
      ),

    activityCode:
      toString(
        data.activityCode
      ),

    sessionDate:
      toString(
        data.sessionDate
      ),

    sessionDateBS:
      toString(
        data.sessionDateBS
      ),

    status:
      getAttendanceStatus(
        data.status
      ),

    sessionFee,

    chargeAmount,

    dueAmount,

    billingStatus:
      getBillingStatus(
        data.billingStatus,
        chargeAmount
      ),

    notes:
      data.notes
        ? toString(data.notes)
        : undefined,

    createdAt:
      data.createdAt,

    updatedAt:
      data.updatedAt,
  };
}

function sanitizeForFirestore<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, itemValue]) => itemValue !== undefined)
  ) as T;
}

function getAttendanceKey(record: {
  studentId: string;
  activityId: string;
  sessionDate?: string;
  sessionDateBS?: string;
}): string {
  return `${record.studentId}_${record.activityId}_${
    record.sessionDateBS || record.sessionDate || ""
  }`;
}

function deduplicateAttendances(records: Attendance[]): Attendance[] {
  const uniqueRecords = new Map<string, Attendance>();

  for (const record of records) {
    uniqueRecords.set(getAttendanceKey(record), record);
  }

  return Array.from(uniqueRecords.values());
}

/* =========================================================
   CREATE
========================================================= */

export async function createAttendance(
  data: Omit<
    Attendance,
    | "id"
    | "attendanceCode"
    | "createdAt"
    | "updatedAt"
  >
): Promise<string> {
  return insertAttendance(data, await getAttendanceActor());
}

async function insertAttendance(
  data: Omit<Attendance, "id" | "attendanceCode" | "createdAt" | "updatedAt">,
  actor: AttendanceActor,
  existingCode?: string,
): Promise<string> {
  const attendanceCode = existingCode || await generateAttendanceCode();

  const recordRef = doc(collection(db, COLLECTION_NAME));
  await writeAttendanceWithHistory(recordRef.id, { ...data, attendanceCode }, actor);
  return recordRef.id;
}

/* =========================================================
   GET BY ID
========================================================= */

export async function getAttendanceById(
  id: string
): Promise<Attendance | null> {
  if (!id) {
    return null;
  }

  const docRef =
    doc(
      db,
      COLLECTION_NAME,
      id
    );

  const snapshot =
    await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return (await hydrateActivityReferences([mapAttendanceDoc(
    snapshot.id,
    snapshot.data() as Record<
      string,
      unknown
    >
  )]))[0];
}

/* =========================================================
   GET BY DATE BS
========================================================= */

export async function getAttendanceByDate(
  sessionDateBS: string
): Promise<Attendance[]> {
  if (!sessionDateBS) {
    return [];
  }

  const q =
    query(
      collection(
        db,
        COLLECTION_NAME
      ),
      where(
        "sessionDateBS",
        "==",
        sessionDateBS
      )
    );

  const snapshot =
    await getDocs(q);

  return hydrateActivityReferences(deduplicateAttendances(
    snapshot.docs.map(
      (docSnap) =>
        mapAttendanceDoc(
          docSnap.id,
          docSnap.data() as Record<
            string,
            unknown
          >
        )
    )
  ));
}

/* =========================================================
   GROUP ATTENDANCE BY ACTIVITY
========================================================= */

export function groupAttendancesByActivity(
  records: Attendance[]
): ActivityAttendanceSummary[] {
  const map = new Map<string, ActivityAttendanceSummary>();

  for (const record of records) {
    const actId = record.activityId || "general";
    if (!map.has(actId)) {
      map.set(actId, {
        activityId: record.activityId || "",
        activityName: record.activityName || "General Activity",
        activityCode: record.activityCode || "",
        totalStudents: 0,
        presentCount: 0,
        absentCount: 0,
        sessionFeeTotal: 0,
        records: [],
      });
    }

    const group = map.get(actId)!;
    group.totalStudents += 1;
    if (record.status === "Present") {
      group.presentCount += 1;
      group.sessionFeeTotal += record.sessionFee || 0;
    } else {
      group.absentCount += 1;
    }
    group.records.push(record);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.activityName.localeCompare(b.activityName)
  );
}

/* =========================================================
   SAVE BATCH (DATE-SPECIFIC & ARRAY ENTRY PER ACTIVITIES)
========================================================= */

export async function saveBatchAttendance(
  records: Array<
    Omit<
      Attendance,
      | "id"
      | "attendanceCode"
      | "createdAt"
      | "updatedAt"
    > & {
      id?: string;
      attendanceCode?: string;
    }
  >
): Promise<void> {
  const validRecords = Array.from(
    new Map(
      records
        .filter(
          (record) =>
            record.enrollmentId &&
            record.studentId &&
            record.activityId &&
            record.sessionDate
        )
        .map((record) => [getAttendanceKey(record), record])
    ).values()
  );

  /*
   * Keep one attendance row per student, activity, and date even when
   * duplicate enrollment rows are present in the roster.
   */
  const validRecordsWithDate = validRecords.filter(
    (record) =>
      record.enrollmentId &&
      record.studentId &&
      record.activityId &&
      record.sessionDate
  );

  if (validRecordsWithDate.length === 0) {
    throw new Error(
      "No valid attendance rows were provided to save."
    );
  }

  const savedAttendances: Attendance[] = [];
  const actor = await getAttendanceActor();
  const dateBS =
    validRecordsWithDate[0].sessionDateBS || validRecordsWithDate[0].sessionDate;

  let existingDateRecords: Attendance[];
  try {
    existingDateRecords = await getAttendanceByDate(dateBS);
  } catch {
    existingDateRecords = [];
  }

  const existingByKey = new Map(
    existingDateRecords.map((record) => [getAttendanceKey(record), record])
  );

  for (const record of validRecordsWithDate) {
    const existingRecord = existingByKey.get(getAttendanceKey(record)) || (record.id ? await getAttendanceById(record.id) : undefined);
    let savedId = record.id || existingRecord?.id;
    let attendanceCode = record.attendanceCode || existingRecord?.attendanceCode;
    if (!attendanceCode) attendanceCode = await generateAttendanceCode();
    if (!savedId) savedId = doc(collection(db, COLLECTION_NAME)).id;
    const savedRecord = await writeAttendanceWithHistory(savedId, {
      enrollmentId: record.enrollmentId,
      enrollmentCode: record.enrollmentCode ?? "",
      studentId: record.studentId,
      studentName: record.studentName ?? "",
      studentCode: record.studentCode ?? "",
      activityId: record.activityId,
      attendanceCode,
      sessionDate: record.sessionDate,
      sessionDateBS: record.sessionDateBS ?? record.sessionDate,
      status: record.status,
      sessionFee: record.sessionFee ?? 0,
      chargeAmount: record.chargeAmount ?? 0,
      dueAmount: record.dueAmount ?? 0,
      billingStatus: record.billingStatus ?? "No Charge",
      notes: record.notes ?? "",
    }, actor, existingRecord || undefined);
    savedAttendances.push({ ...savedRecord, activityName: record.activityName ?? "", activityCode: record.activityCode ?? "" });
  }

  /*
   * Fetch all existing attendance records for this dateBS from 'attendances' collection
   * to ensure daily_attendances document contains ALL activities and ALL student records for this dateBS.
   */
  let allDateAttendances: Attendance[];
  try {
    const existingDateRecords = await getAttendanceByDate(dateBS);
    const map = new Map<string, Attendance>();

    // Add existing records to map by student, activity, and date.
    for (const rec of existingDateRecords) {
      const key = getAttendanceKey(rec);
      map.set(key, rec);
    }

    // Overlay newly saved batch attendances
    for (const rec of savedAttendances) {
      const key = getAttendanceKey(rec);
      map.set(key, rec);
    }

    allDateAttendances = Array.from(map.values());
  } catch {
    allDateAttendances = savedAttendances;
  }

  /*
   * Save Date-Specific Daily Document with array entry of all attendance
   * in correspondence to the activities.
   */
  try {
    const activityGroups = groupAttendancesByActivity(allDateAttendances);
    const presentCount = allDateAttendances.filter(
      (r) => r.status === "Present"
    ).length;
    const absentCount = allDateAttendances.filter(
      (r) => r.status === "Absent"
    ).length;
    const totalSessionFees = allDateAttendances
      .filter((r) => r.status === "Present")
      .reduce((sum, r) => sum + (r.sessionFee || 0), 0);

    const dailyDocRef = doc(db, DAILY_COLLECTION_NAME, dateBS);
    const dailyPayload = sanitizeForFirestore({
      id: dateBS,
      sessionDateBS: dateBS,
      sessionDate:
        validRecordsWithDate[0].sessionDate || convertBSToAD(dateBS),
      totalRecords: allDateAttendances.length,
      presentCount,
      absentCount,
      totalSessionFees,
      activitiesCount: activityGroups.length,
      attendances: allDateAttendances.map((item) => sanitizeForFirestore({ ...withoutActivityLabels(item) })),
      activities: activityGroups.map((group) => ({
        activityId: group.activityId,
        totalStudents: group.totalStudents,
        presentCount: group.presentCount,
        absentCount: group.absentCount,
        sessionFeeTotal: group.sessionFeeTotal,
        records: group.records.map((r) => sanitizeForFirestore({ ...withoutActivityLabels(r) })),
      })),
      updatedAt: Timestamp.now(),
    });

    await setDoc(dailyDocRef, dailyPayload, { merge: true });
  } catch (error) {
    console.warn("Could not write to daily_attendances document:", error);
  }
}

/* =========================================================
   GET DAILY ATTENDANCE BY DATE BS
========================================================= */

export async function getDailyAttendanceByDate(
  sessionDateBS: string
): Promise<DailyAttendanceRecord | null> {
  if (!sessionDateBS) {
    return null;
  }

  // 1. Fetch all individual attendance records from the 'attendances' collection for dateBS
  const records = await getAttendanceByDate(sessionDateBS);
  let allRecords = records;

  // 2. Fallback to daily_attendances collection if no records returned from attendances collection
  if (allRecords.length === 0) {
    try {
      const dailyRef = doc(db, DAILY_COLLECTION_NAME, sessionDateBS);
      const dailySnap = await getDoc(dailyRef);

      if (dailySnap.exists()) {
        const data = dailySnap.data() as Record<string, unknown>;
        if (Array.isArray(data.attendances)) {
          allRecords = (data.attendances as Record<string, unknown>[]).map((item, index) =>
            mapAttendanceDoc(
              (item.id as string) || `${sessionDateBS}-${index}`,
              item
            )
          );
        }
      }
    } catch (err) {
      console.warn("Error reading daily_attendances fallback:", err);
    }
  }

  if (allRecords.length === 0) {
    return null;
  }

  allRecords = await hydrateActivityReferences(deduplicateAttendances(allRecords));

  const activities = groupAttendancesByActivity(allRecords);
  const presentCount = allRecords.filter((r) => r.status === "Present").length;
  const absentCount = allRecords.filter((r) => r.status === "Absent").length;
  const totalSessionFees = allRecords
    .filter((r) => r.status === "Present")
    .reduce((sum, r) => sum + (r.sessionFee || 0), 0);

  return {
    id: sessionDateBS,
    sessionDateBS,
    sessionDate: convertBSToAD(sessionDateBS),
    totalRecords: allRecords.length,
    presentCount,
    absentCount,
    totalSessionFees,
    activitiesCount: activities.length,
    attendances: allRecords,
    activities,
  };
}

/* =========================================================
   GET ALL DISTINCT ATTENDANCE DATES (BS)
========================================================= */

export async function getAllAttendanceDatesBS(): Promise<string[]> {
  const dates = new Set<string>();

  try {
    const dailySnap = await getDocs(collection(db, DAILY_COLLECTION_NAME));
    dailySnap.docs.forEach((d) => {
      if (d.id) dates.add(d.id);
    });
  } catch (err) {
    console.warn("Could not load daily_attendances:", err);
  }

  try {
    const attendancesSnap = await getDocs(
      query(collection(db, COLLECTION_NAME), orderBy("sessionDateBS", "desc"))
    );
    attendancesSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.sessionDateBS) {
        dates.add(data.sessionDateBS);
      }
    });
  } catch (err) {
    console.warn("Could not load attendances dates:", err);
  }

  return Array.from(dates).sort((a, b) => b.localeCompare(a));
}

/* =========================================================
   UPDATE
========================================================= */

export async function updateAttendance(
  id: string,
  data: Partial<
    Omit<
      Attendance,
      | "id"
      | "attendanceCode"
      | "createdAt"
    >
  >
): Promise<void> {
  if (!id) {
    throw new Error(
      "Attendance ID is required."
    );
  }

  const [actor, existing] = await Promise.all([getAttendanceActor(), getAttendanceById(id)]);
  if (!existing) throw new Error("Attendance record no longer exists.");
  await writeAttendanceWithHistory(id, data, actor);

}

/* =========================================================
   DELETE
========================================================= */

export async function deleteAttendance(
  id: string
): Promise<void> {
  if (!id) {
    throw new Error(
      "Attendance ID is required."
    );
  }

  const record = await getAttendanceById(id);
  if (!record) return;
  const result = await deleteAttendanceRecords([record]);
  if (result.failed.length) throw new Error("Unable to delete attendance. Please retry.");
}

/** Delete selected records and their daily-summary copies together. Each
 * transaction stays below Firestore's write limit; failures are reported so
 * the UI can retain only the records that still need deleting.
 */
export async function deleteAttendanceRecords(records: Attendance[]): Promise<{ deleted: Attendance[]; failed: Attendance[] }> {
  const unique = [...new Map(records.filter((record) => record.id).map((record) => [record.id!, record])).values()];
  const deleted: Attendance[] = [];
  const failed: Attendance[] = [];
  for (let offset = 0; offset < unique.length; offset += 200) {
    const chunk = unique.slice(offset, offset + 200);
    try {
      await runTransaction(db, async (transaction) => {
        const dates = [...new Set(chunk.map((record) => record.sessionDateBS))];
        if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) throw new Error("Attendance date is missing.");
        const refs = chunk.map((record) => doc(db, COLLECTION_NAME, record.id!));
        const dailyRefs = dates.map((date) => doc(db, DAILY_COLLECTION_NAME, date));
        const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
        const summaries = await Promise.all(dailyRefs.map((ref) => transaction.get(ref)));
        snapshots.forEach((snapshot, index) => {
          if (snapshot.exists() && getAttendanceKey(snapshot.data() as Attendance) !== getAttendanceKey(chunk[index])) {
            throw new Error("Attendance changed. Refresh and select it again.");
          }
        });
        const keys = new Set(chunk.map(getAttendanceKey));
        summaries.forEach((snapshot, index) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data();
          const source = (Array.isArray(data.attendances) ? data.attendances : []) as Attendance[];
          const remaining = source.filter((record) => !keys.has(getAttendanceKey({ ...record, sessionDateBS: record.sessionDateBS || dates[index] })));
          if (!remaining.length) {
            transaction.delete(dailyRefs[index]);
            return;
          }
          const activities = groupAttendancesByActivity(remaining);
          transaction.update(dailyRefs[index], {
            attendances: remaining.map(withoutActivityLabels),
            totalRecords: remaining.length,
            presentCount: remaining.filter((record) => record.status === "Present").length,
            absentCount: remaining.filter((record) => record.status === "Absent").length,
            totalSessionFees: remaining.filter((record) => record.status === "Present").reduce((sum, record) => sum + (record.sessionFee || 0), 0),
            activities: activities.map((group) => ({
              ...withoutActivityLabels(group),
              records: group.records.map(withoutActivityLabels),
            })),
            activitiesCount: activities.length,
            updatedAt: Timestamp.now(),
          });
        });
        snapshots.forEach((snapshot, index) => { if (snapshot.exists()) transaction.delete(refs[index]); });
      });
      deleted.push(...chunk);
    } catch (error) {
      console.error("Unable to delete selected attendance:", error);
      failed.push(...chunk);
    }
  }
  return { deleted, failed };
}

/* =========================================================
   GET ALL
========================================================= */

export async function getAllAttendances(): Promise<
  Attendance[]
> {
  const q =
    query(
      collection(
        db,
        COLLECTION_NAME
      ),
      orderBy(
        "sessionDateBS",
        "desc"
      )
    );

  const snapshot =
    await getDocs(q);

  return hydrateActivityReferences(snapshot.docs.map(
    (docSnap) =>
      mapAttendanceDoc(
        docSnap.id,
        docSnap.data() as Record<
          string,
          unknown
        >
      )
  ));
}

/* =========================================================
   GET BY ENROLLMENT
========================================================= */

export async function getAttendanceByEnrollmentId(
  enrollmentId: string
): Promise<Attendance[]> {
  if (!enrollmentId) {
    return [];
  }

  const q =
    query(
      collection(
        db,
        COLLECTION_NAME
      ),
      where(
        "enrollmentId",
        "==",
        enrollmentId
      )
    );

  const snapshot =
    await getDocs(q);

  return hydrateActivityReferences(snapshot.docs
    .map(
      (docSnap) =>
        mapAttendanceDoc(
          docSnap.id,
          docSnap.data() as Record<
            string,
            unknown
          >
        )
    )
    .sort(
      (a, b) =>
        String(
          b.sessionDateBS
        ).localeCompare(
          String(
            a.sessionDateBS
          )
        )
    ));
}

/* =========================================================
   GET BY STUDENT
========================================================= */

export async function getAttendanceByStudentId(
  studentId: string
): Promise<Attendance[]> {
  if (!studentId) {
    return [];
  }

  const q =
    query(
      collection(
        db,
        COLLECTION_NAME
      ),
      where(
        "studentId",
        "==",
        studentId
      )
    );

  const snapshot =
    await getDocs(q);

  return hydrateActivityReferences(snapshot.docs
    .map(
      (docSnap) =>
        mapAttendanceDoc(
          docSnap.id,
          docSnap.data() as Record<
            string,
            unknown
          >
        )
    )
    .sort(
      (a, b) =>
        String(
          b.sessionDateBS
        ).localeCompare(
          String(
            a.sessionDateBS
          )
        )
    ));
}

/* =========================================================
   GET BY ACTIVITY
========================================================= */

export async function getAttendanceByActivityId(
  activityId: string
): Promise<Attendance[]> {
  if (!activityId) {
    return [];
  }

  const q =
    query(
      collection(
        db,
        COLLECTION_NAME
      ),
      where(
        "activityId",
        "==",
        activityId
      )
    );

  const snapshot =
    await getDocs(q);

  return hydrateActivityReferences(snapshot.docs
    .map(
      (docSnap) =>
        mapAttendanceDoc(
          docSnap.id,
          docSnap.data() as Record<
            string,
            unknown
          >
        )
    )
    .sort(
      (a, b) =>
        String(
          b.sessionDateBS
        ).localeCompare(
          String(
            a.sessionDateBS
          )
        )
    ));
}
