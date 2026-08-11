import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import type { StudentFormData } from "../schemas/student.schema";
import type { Student } from "../types/student.types";

export async function getStudentById(
  studentId: string
) {
  const snapshot = await getDoc(
    doc(db, "students", studentId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Student;
}

export async function updateStudent(
  studentId: string,
  data: StudentFormData
) {
  await updateDoc(doc(db, "students", studentId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}