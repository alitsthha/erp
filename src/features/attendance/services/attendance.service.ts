import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import type {
  Attendance,
  AttendanceStatus,
  BillingStatus,
} from "@/features/attendance/types/attendance.types";

import {
  generateAttendanceCode,
} from "@/features/attendance/services/attendance-code.service";

const COLLECTION_NAME =
  "attendances";

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
   SAVE BATCH
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

  for (
    const record of validRecords
  ) {
    if (record.id) {
      const docRef =
        doc(
          db,
          COLLECTION_NAME,
          record.id
        );

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

      await updateDoc(
        docRef,
        payload
      );
    } else {
      const payload = sanitizeForFirestore({
        ...record,
        id: undefined,
      });

      await createAttendance(
        payload as Omit<
          Attendance,
          | "id"
          | "attendanceCode"
          | "createdAt"
          | "updatedAt"
        >
      );
    }
  }
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