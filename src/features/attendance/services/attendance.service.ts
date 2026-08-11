import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import type { Attendance } from "@/features/attendance/types/attendance.types";
import { generateAttendanceCode } from "@/features/attendance/services/attendance-code.service";

const COLLECTION_NAME = "attendances";

export async function createAttendance(
  data: Omit<Attendance, "id" | "attendanceCode" | "createdAt" | "updatedAt">
): Promise<string> {
  const attendanceCode = await generateAttendanceCode();

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    attendanceCode,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return docRef.id;
}

export async function getAttendanceById(id: string): Promise<Attendance | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Attendance;
}

export async function updateAttendance(
  id: string,
  data: Partial<Omit<Attendance, "id" | "attendanceCode" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteAttendance(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

export async function getAllAttendances(): Promise<Attendance[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy("sessionDateBS", "desc")
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Attendance[];
}

export async function getAttendanceByEnrollmentId(
  enrollmentId: string
): Promise<Attendance[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("enrollmentId", "==", enrollmentId),
    orderBy("sessionDateBS", "desc")
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Attendance[];
}

export async function getAttendanceByStudentId(
  studentId: string
): Promise<Attendance[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("studentId", "==", studentId),
    orderBy("sessionDateBS", "desc")
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Attendance[];
}

export async function getAttendanceByActivityId(
  activityId: string
): Promise<Attendance[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("activityId", "==", activityId),
    orderBy("sessionDateBS", "desc")
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Attendance[];
}
