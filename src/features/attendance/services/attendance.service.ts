import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import type { Attendance } from "@/features/attendance/types/attendance.types";

import {
  generateAttendanceCode,
} from "@/features/attendance/services/attendance-code.service";

const COLLECTION_NAME = "attendances";

/* =========================================================
   CREATE ATTENDANCE
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

  const docRef = await addDoc(
    collection(
      db,
      COLLECTION_NAME
    ),
    {
      ...data,

      attendanceCode,

      createdAt:
        Timestamp.now(),

      updatedAt:
        Timestamp.now(),
    }
  );

  return docRef.id;
}

/* =========================================================
   GET ATTENDANCE BY ID
========================================================= */

export async function getAttendanceById(
  id: string
): Promise<Attendance | null> {
  if (!id) {
    return null;
  }

  const docRef = doc(
    db,
    COLLECTION_NAME,
    id
  );

  const docSnap =
    await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data =
    docSnap.data();

  return {
    id: docSnap.id,

    attendanceCode:
      data.attendanceCode ?? "",

    enrollmentId:
      data.enrollmentId ?? "",

    enrollmentCode:
      data.enrollmentCode ?? "",

    studentId:
      data.studentId ?? "",

    studentName:
      data.studentName ?? "",

    studentCode:
      data.studentCode ?? "",

    activityId:
      data.activityId ?? "",

    activityName:
      data.activityName ?? "",

    activityCode:
      data.activityCode ?? "",

    sessionDate:
      data.sessionDate ?? "",

    sessionDateBS:
      data.sessionDateBS ?? "",

    status:
      data.status ?? "Absent",

    sessionFee:
      Number(
        data.sessionFee ?? 0
      ),

    notes:
      data.notes ?? "",

    createdAt:
      data.createdAt,

    updatedAt:
      data.updatedAt,
  };
}

/* =========================================================
   GET ATTENDANCE BY DATE (BS)
========================================================= */

export async function getAttendanceByDate(
  sessionDateBS: string
): Promise<Attendance[]> {
  if (!sessionDateBS) {
    return [];
  }

  const q = query(
    collection(db, COLLECTION_NAME),
    where("sessionDateBS", "==", sessionDateBS)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      attendanceCode: data.attendanceCode ?? "",
      enrollmentId: data.enrollmentId ?? "",
      enrollmentCode: data.enrollmentCode ?? "",
      studentId: data.studentId ?? "",
      studentName: data.studentName ?? "",
      studentCode: data.studentCode ?? "",
      activityId: data.activityId ?? "",
      activityName: data.activityName ?? "",
      activityCode: data.activityCode ?? "",
      sessionDate: data.sessionDate ?? "",
      sessionDateBS: data.sessionDateBS ?? "",
      status: data.status ?? "Absent",
      sessionFee: Number(data.sessionFee ?? 0),
      notes: data.notes ?? "",
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

/* =========================================================
   SAVE BATCH ATTENDANCE FOR A DATE
========================================================= */

export async function saveBatchAttendance(
  records: Array<
    Omit<
      Attendance,
      "id" | "attendanceCode" | "createdAt" | "updatedAt"
    > & { id?: string }
  >
): Promise<void> {
  for (const record of records) {
    if (record.id) {
      const docRef = doc(db, COLLECTION_NAME, record.id);
      await updateDoc(docRef, {
        status: record.status,
        sessionFee: record.sessionFee,
        notes: record.notes ?? "",
        updatedAt: Timestamp.now(),
      });
    } else {
      await createAttendance(record);
    }
  }
}

/* =========================================================
   UPDATE ATTENDANCE
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

  const docRef = doc(
    db,
    COLLECTION_NAME,
    id
  );

  await updateDoc(
    docRef,
    {
      ...data,

      updatedAt:
        Timestamp.now(),
    }
  );
}

/* =========================================================
   DELETE ATTENDANCE
========================================================= */

export async function deleteAttendance(
  id: string
): Promise<void> {
  if (!id) {
    throw new Error(
      "Attendance ID is required."
    );
  }

  const docRef = doc(
    db,
    COLLECTION_NAME,
    id
  );

  await deleteDoc(docRef);
}

/* =========================================================
   GET ALL ATTENDANCES
========================================================= */

export async function getAllAttendances(): Promise<
  Attendance[]
> {
  const q = query(
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
    (attendanceDoc) => {
      const data =
        attendanceDoc.data();

      return {
        id:
          attendanceDoc.id,

        attendanceCode:
          data.attendanceCode ?? "",

        enrollmentId:
          data.enrollmentId ?? "",

        enrollmentCode:
          data.enrollmentCode ?? "",

        studentId:
          data.studentId ?? "",

        studentName:
          data.studentName ?? "",

        studentCode:
          data.studentCode ?? "",

        activityId:
          data.activityId ?? "",

        activityName:
          data.activityName ?? "",

        activityCode:
          data.activityCode ?? "",

        sessionDate:
          data.sessionDate ?? "",

        sessionDateBS:
          data.sessionDateBS ?? "",

        status:
          data.status ?? "Absent",

        sessionFee:
          Number(
            data.sessionFee ?? 0
          ),

        notes:
          data.notes ?? "",

        createdAt:
          data.createdAt,

        updatedAt:
          data.updatedAt,
      };
    }
  );
}

/* =========================================================
   GET ATTENDANCE BY ENROLLMENT
========================================================= */

export async function getAttendanceByEnrollmentId(
  enrollmentId: string
): Promise<Attendance[]> {
  if (!enrollmentId) {
    return [];
  }

  const q = query(
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
      (attendanceDoc) => {
        const data =
          attendanceDoc.data();

        return {
          id:
            attendanceDoc.id,

          attendanceCode:
            data.attendanceCode ?? "",

          enrollmentId:
            data.enrollmentId ?? "",

          enrollmentCode:
            data.enrollmentCode ?? "",

          studentId:
            data.studentId ?? "",

          studentName:
            data.studentName ?? "",

          studentCode:
            data.studentCode ?? "",

          activityId:
            data.activityId ?? "",

          activityName:
            data.activityName ?? "",

          activityCode:
            data.activityCode ?? "",

          sessionDate:
            data.sessionDate ?? "",

          sessionDateBS:
            data.sessionDateBS ?? "",

          status:
            data.status ?? "Absent",

          sessionFee:
            Number(
              data.sessionFee ?? 0
            ),

          notes:
            data.notes ?? "",

          createdAt:
            data.createdAt,

          updatedAt:
            data.updatedAt,
        };
      }
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
   GET ATTENDANCE BY STUDENT
========================================================= */

export async function getAttendanceByStudentId(
  studentId: string
): Promise<Attendance[]> {
  if (!studentId) {
    return [];
  }

  const q = query(
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
      (attendanceDoc) => {
        const data =
          attendanceDoc.data();

        return {
          id:
            attendanceDoc.id,

          attendanceCode:
            data.attendanceCode ?? "",

          enrollmentId:
            data.enrollmentId ?? "",

          enrollmentCode:
            data.enrollmentCode ?? "",

          studentId:
            data.studentId ?? "",

          studentName:
            data.studentName ?? "",

          studentCode:
            data.studentCode ?? "",

          activityId:
            data.activityId ?? "",

          activityName:
            data.activityName ?? "",

          activityCode:
            data.activityCode ?? "",

          sessionDate:
            data.sessionDate ?? "",

          sessionDateBS:
            data.sessionDateBS ?? "",

          status:
            data.status ?? "Absent",

          sessionFee:
            Number(
              data.sessionFee ?? 0
            ),

          notes:
            data.notes ?? "",

          createdAt:
            data.createdAt,

          updatedAt:
            data.updatedAt,
        };
      }
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
   GET ATTENDANCE BY ACTIVITY
========================================================= */

export async function getAttendanceByActivityId(
  activityId: string
): Promise<Attendance[]> {
  if (!activityId) {
    return [];
  }

  const q = query(
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
      (attendanceDoc) => {
        const data =
          attendanceDoc.data();

        return {
          id:
            attendanceDoc.id,

          attendanceCode:
            data.attendanceCode ?? "",

          enrollmentId:
            data.enrollmentId ?? "",

          enrollmentCode:
            data.enrollmentCode ?? "",

          studentId:
            data.studentId ?? "",

          studentName:
            data.studentName ?? "",

          studentCode:
            data.studentCode ?? "",

          activityId:
            data.activityId ?? "",

          activityName:
            data.activityName ?? "",

          activityCode:
            data.activityCode ?? "",

          sessionDate:
            data.sessionDate ?? "",

          sessionDateBS:
            data.sessionDateBS ?? "",

          status:
            data.status ?? "Absent",

          sessionFee:
            Number(
              data.sessionFee ?? 0
            ),

          notes:
            data.notes ?? "",

          createdAt:
            data.createdAt,

          updatedAt:
            data.updatedAt,
        };
      }
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