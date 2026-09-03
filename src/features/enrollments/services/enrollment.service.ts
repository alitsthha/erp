import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import {
  generateEnrollmentCode,
} from "./enrollment-code.service";

import type { EnrollmentFormData } from "../schemas/enrollment.schema";
import type { Enrollment } from "../types/enrollment.types";

import type { Student } from "@/features/students/types/student.types";
import type { Activity } from "@/features/activities/types/activity.types";

/* =========================================================
   GET ALL ENROLLMENTS
========================================================= */

export async function getEnrollments(): Promise<Enrollment[]> {
  const enrollmentQuery = query(
    collection(db, "enrollments"),
    orderBy("enrollmentCode", "asc")
  );

  const snapshot = await getDocs(enrollmentQuery);

  return snapshot.docs.map(
    (enrollmentDoc) => ({
      id: enrollmentDoc.id,
      ...enrollmentDoc.data(),
    })
  ) as Enrollment[];
}

export async function getAllEnrollments(): Promise<Enrollment[]> {
  return getEnrollments();
}

/* =========================================================
   GET SINGLE ENROLLMENT
========================================================= */

export async function getEnrollmentById(
  enrollmentId: string
): Promise<Enrollment | null> {
  if (!enrollmentId) {
    return null;
  }

  const snapshot = await getDoc(
    doc(db, "enrollments", enrollmentId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Enrollment;
}

/* =========================================================
   GET STUDENTS
========================================================= */

export async function getStudentsForEnrollment(): Promise<Student[]> {
  const snapshot = await getDocs(
    collection(db, "students")
  );

  return snapshot.docs.map(
    (studentDoc) => ({
      id: studentDoc.id,
      ...studentDoc.data(),
    })
  ) as Student[];
}

/* =========================================================
   GET ACTIVITIES
========================================================= */

export async function getActivitiesForEnrollment(): Promise<Activity[]> {
  const snapshot = await getDocs(
    collection(db, "activities")
  );

  return snapshot.docs.map(
    (activityDoc) => ({
      id: activityDoc.id,
      ...activityDoc.data(),
    })
  ) as Activity[];
}

async function ensureEnrollmentIsUnique(
  studentId: string,
  activityId: string,
  enrollmentId?: string
): Promise<void> {
  const snapshot = await getDocs(
    query(
      collection(db, "enrollments"),
      where("studentId", "==", studentId),
      where("activityId", "==", activityId)
    )
  );

  const duplicate = snapshot.docs.some(
    (enrollmentDoc) => enrollmentDoc.id !== enrollmentId
  );

  if (duplicate) {
    throw new Error(
      "This student is already enrolled in the selected activity."
    );
  }
}

/* =========================================================
   ADD ENROLLMENT
========================================================= */

export async function addEnrollment(
  data: EnrollmentFormData
): Promise<string> {
  await ensureEnrollmentIsUnique(data.studentId, data.activityId);

  const enrollmentCode = await generateEnrollmentCode();

  const studentSnapshot = await getDoc(
    doc(db, "students", data.studentId)
  );

  const activitySnapshot = await getDoc(
    doc(db, "activities", data.activityId)
  );

  if (!studentSnapshot.exists()) {
    throw new Error("Selected student was not found.");
  }

  if (!activitySnapshot.exists()) {
    throw new Error("Selected activity was not found.");
  }

  const student = studentSnapshot.data();
  const activity = activitySnapshot.data() as Activity;

  const numSessionFee = data.sessionFee
    ? Number(data.sessionFee)
    : (activity.feePerSession ?? activity.sessionFee ?? activity.fee ?? 0);

  const docRef = await addDoc(
    collection(db, "enrollments"),
    {
      enrollmentCode,

      studentId: data.studentId,
      studentName: student.fullName ?? "",
      studentCode: student.studentCode ?? "",

      activityId: data.activityId,
      activityName: activity.activityName ?? "",
      activityCode: activity.activityCode ?? "",

      enrollmentDate: data.enrollmentDate,
      sessionFee: numSessionFee,

      notes: data.notes ?? "",
      status: data.status,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return docRef.id;
}

/* =========================================================
   UPDATE ENROLLMENT
========================================================= */

export async function updateEnrollment(
  enrollmentId: string,
  data: EnrollmentFormData
): Promise<void> {
  if (!enrollmentId) {
    throw new Error("Enrollment ID is required.");
  }

  await ensureEnrollmentIsUnique(
    data.studentId,
    data.activityId,
    enrollmentId
  );

  const studentSnapshot = await getDoc(
    doc(db, "students", data.studentId)
  );

  const activitySnapshot = await getDoc(
    doc(db, "activities", data.activityId)
  );

  if (!studentSnapshot.exists()) {
    throw new Error("Selected student was not found.");
  }

  if (!activitySnapshot.exists()) {
    throw new Error("Selected activity was not found.");
  }

  const student = studentSnapshot.data();
  const activity = activitySnapshot.data() as Activity;

  const numSessionFee = data.sessionFee
    ? Number(data.sessionFee)
    : (activity.feePerSession ?? activity.sessionFee ?? activity.fee ?? 0);

  await updateDoc(
    doc(db, "enrollments", enrollmentId),
    {
      studentId: data.studentId,
      studentName: student.fullName ?? "",
      studentCode: student.studentCode ?? "",

      activityId: data.activityId,
      activityName: activity.activityName ?? "",
      activityCode: activity.activityCode ?? "",

      enrollmentDate: data.enrollmentDate,
      sessionFee: numSessionFee,

      notes: data.notes ?? "",
      status: data.status,

      updatedAt: serverTimestamp(),
    }
  );
}

/* =========================================================
   DELETE ENROLLMENT
========================================================= */

export async function deleteEnrollment(
  enrollmentId: string
): Promise<void> {
  if (!enrollmentId) {
    throw new Error("Enrollment ID is required.");
  }

  await deleteDoc(
    doc(db, "enrollments", enrollmentId)
  );
}