import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
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
  const attendanceCode =
    await generateAttendanceCode();

  const payload = sanitizeForFirestore({
    ...data,
    attendanceCode,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const docRef =
    await addDoc(
      collection(
        db,
        COLLECTION_NAME
      ),
      payload
    );

  return docRef.id;
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

  return mapAttendanceDoc(
    snapshot.id,
    snapshot.data() as Record<
      string,
      unknown
    >
  );
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

  return snapshot.docs.map(
    (docSnap) =>
      mapAttendanceDoc(
        docSnap.id,
        docSnap.data() as Record<
          string,
          unknown
        >
      )
  );
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
  const validRecords = records.filter(
    (record) =>
      record.enrollmentId &&
      record.studentId &&
      record.activityId &&
      record.sessionDate
  );

  if (validRecords.length === 0) {
    throw new Error(
      "No valid attendance rows were provided to save."
    );
  }

  const savedAttendances: Attendance[] = [];
  const dateBS =
    validRecords[0].sessionDateBS || validRecords[0].sessionDate;

  for (const record of validRecords) {
    let savedId = record.id;
    let attendanceCode = record.attendanceCode;

    if (savedId) {
      const docRef = doc(db, COLLECTION_NAME, savedId);
      const payload = sanitizeForFirestore({
        enrollmentId: record.enrollmentId,
        enrollmentCode: record.enrollmentCode ?? "",
        studentId: record.studentId,
        studentName: record.studentName ?? "",
        studentCode: record.studentCode ?? "",
        activityId: record.activityId,
        activityName: record.activityName ?? "",
        activityCode: record.activityCode ?? "",
        sessionDate: record.sessionDate,
        sessionDateBS: record.sessionDateBS ?? record.sessionDate,
        status: record.status,
        sessionFee: record.sessionFee ?? 0,
        chargeAmount: record.chargeAmount ?? 0,
        dueAmount: record.dueAmount ?? 0,
        billingStatus: record.billingStatus ?? "No Charge",
        notes: record.notes ?? "",
        updatedAt: Timestamp.now(),
      });

      await updateDoc(docRef, payload);
    } else {
      if (!attendanceCode) {
        attendanceCode = await generateAttendanceCode();
      }

      const payload = sanitizeForFirestore({
        ...record,
        attendanceCode,
        id: undefined,
      });

      savedId = await createAttendance(
        payload as Omit<
          Attendance,
          | "id"
          | "attendanceCode"
          | "createdAt"
          | "updatedAt"
        >
      );
    }

    savedAttendances.push({
      id: savedId,
      attendanceCode: attendanceCode || "",
      enrollmentId: record.enrollmentId,
      enrollmentCode: record.enrollmentCode ?? "",
      studentId: record.studentId,
      studentName: record.studentName ?? "",
      studentCode: record.studentCode ?? "",
      activityId: record.activityId,
      activityName: record.activityName ?? "",
      activityCode: record.activityCode ?? "",
      sessionDate: record.sessionDate,
      sessionDateBS: record.sessionDateBS ?? record.sessionDate,
      status: record.status,
      sessionFee: record.sessionFee ?? 0,
      chargeAmount: record.chargeAmount ?? 0,
      dueAmount: record.dueAmount ?? 0,
      billingStatus: record.billingStatus ?? "No Charge",
      notes: record.notes ?? "",
      updatedAt: new Date(),
    });
  }

  /*
   * Save Date-Specific Daily Document with array entry of all attendance
   * in correspondence to the activities.
   */
  try {
    const activityGroups = groupAttendancesByActivity(savedAttendances);
    const presentCount = savedAttendances.filter(
      (r) => r.status === "Present"
    ).length;
    const absentCount = savedAttendances.filter(
      (r) => r.status === "Absent"
    ).length;
    const totalSessionFees = savedAttendances
      .filter((r) => r.status === "Present")
      .reduce((sum, r) => sum + (r.sessionFee || 0), 0);

    const dailyDocRef = doc(db, DAILY_COLLECTION_NAME, dateBS);
    const dailyPayload = sanitizeForFirestore({
      id: dateBS,
      sessionDateBS: dateBS,
      sessionDate:
        validRecords[0].sessionDate || convertBSToAD(dateBS),
      totalRecords: savedAttendances.length,
      presentCount,
      absentCount,
      totalSessionFees,
      activitiesCount: activityGroups.length,
      attendances: savedAttendances.map((item) => sanitizeForFirestore({ ...item })),
      activities: activityGroups.map((group) => ({
        activityId: group.activityId,
        activityName: group.activityName,
        activityCode: group.activityCode,
        totalStudents: group.totalStudents,
        presentCount: group.presentCount,
        absentCount: group.absentCount,
        sessionFeeTotal: group.sessionFeeTotal,
        records: group.records.map((r) => sanitizeForFirestore({ ...r })),
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

  // 1. Check daily_attendances collection
  try {
    const dailyRef = doc(db, DAILY_COLLECTION_NAME, sessionDateBS);
    const dailySnap = await getDoc(dailyRef);

    if (dailySnap.exists()) {
      const data = dailySnap.data() as Record<string, unknown>;
      const rawAttendances = Array.isArray(data.attendances)
        ? (data.attendances as Record<string, unknown>[]).map((item, index) =>
            mapAttendanceDoc(
              (item.id as string) || `${sessionDateBS}-${index}`,
              item
            )
          )
        : [];

      const activities = groupAttendancesByActivity(rawAttendances);

      return {
        id: sessionDateBS,
        sessionDateBS,
        sessionDate:
          toString(data.sessionDate) || convertBSToAD(sessionDateBS),
        totalRecords: toNumber(data.totalRecords) || rawAttendances.length,
        presentCount:
          toNumber(data.presentCount) ||
          rawAttendances.filter((r) => r.status === "Present").length,
        absentCount:
          toNumber(data.absentCount) ||
          rawAttendances.filter((r) => r.status === "Absent").length,
        totalSessionFees:
          toNumber(data.totalSessionFees) ||
          rawAttendances
            .filter((r) => r.status === "Present")
            .reduce((sum, r) => sum + (r.sessionFee || 0), 0),
        activitiesCount:
          toNumber(data.activitiesCount) || activities.length,
        attendances: rawAttendances,
        activities,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    }
  } catch (err) {
    console.warn("Error reading from daily_attendances, checking attendances table:", err);
  }

  // 2. Fallback: Query attendances collection
  const records = await getAttendanceByDate(sessionDateBS);
  if (records.length === 0) {
    return null;
  }

  const activities = groupAttendancesByActivity(records);
  const presentCount = records.filter((r) => r.status === "Present").length;
  const absentCount = records.filter((r) => r.status === "Absent").length;
  const totalSessionFees = records
    .filter((r) => r.status === "Present")
    .reduce((sum, r) => sum + (r.sessionFee || 0), 0);

  return {
    id: sessionDateBS,
    sessionDateBS,
    sessionDate: convertBSToAD(sessionDateBS),
    totalRecords: records.length,
    presentCount,
    absentCount,
    totalSessionFees,
    activitiesCount: activities.length,
    attendances: records,
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

  const payload = sanitizeForFirestore({
    ...data,
    updatedAt: Timestamp.now(),
  });

  await updateDoc(
    doc(
      db,
      COLLECTION_NAME,
      id
    ),
    payload
  );
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

  await deleteDoc(
    doc(
      db,
      COLLECTION_NAME,
      id
    )
  );
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

  return snapshot.docs.map(
    (docSnap) =>
      mapAttendanceDoc(
        docSnap.id,
        docSnap.data() as Record<
          string,
          unknown
        >
      )
  );
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

  return snapshot.docs
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
    );
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

  return snapshot.docs
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
    );
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

  return snapshot.docs
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
    );
}