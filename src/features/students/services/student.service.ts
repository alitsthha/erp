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
} from "firebase/firestore";

import { db } from "@/firebase/config";

import { generateStudentCode } from "./student-code.service";

import type { Student } from "../types/student.types";
import type { StudentFormData } from "../schemas/student.schema";

const studentsCollection = collection(db, "students");

/* -----------------------------------------
   Clean undefined values
----------------------------------------- */

function removeUndefined(
  data: Record<string, unknown>
) {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== undefined
    )
  );
}

/* -----------------------------------------
   ADD STUDENT
----------------------------------------- */

export async function addStudent(
  data: StudentFormData
): Promise<string> {
  try {
    console.log(
      "Student data received:",
      data
    );

    const studentData = removeUndefined({
      studentCode: await generateStudentCode(),

      fullName:
        data.fullName?.trim() ?? "",

      guardianName:
        data.guardianName?.trim() ?? "",

      guardianPhone:
        data.guardianPhone?.trim() ?? "",

      guardianEmail:
        data.guardianEmail?.trim() ?? "",

      status:
        data.status ?? "Active",

      address:
        data.address?.trim() ?? "",

      joiningDateBS:
        data.joiningDateBS?.trim() ?? "",

      note:
        data.note?.trim() ?? "",

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    });

    console.log(
      "Sending student to Firestore:",
      studentData
    );

    const docRef = await addDoc(
      studentsCollection,
      studentData
    );

    console.log(
      "Student successfully created:",
      docRef.id
    );

    return docRef.id;

  } catch (error) {
    console.error(
      "addStudent() failed:",
      error
    );

    throw error;
  }
}

/* -----------------------------------------
   GET ALL STUDENTS
----------------------------------------- */

export async function getStudents(): Promise<Student[]> {
  try {
    const q = query(
      studentsCollection,
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (docSnap) => ({
        ...(docSnap.data() as Omit<
          Student,
          "id"
        >),

        id: docSnap.id,
      })
    );

  } catch (error) {
    console.error(
      "getStudents() failed:",
      error
    );

    throw error;
  }
}

/* -----------------------------------------
   GET STUDENT BY ID
----------------------------------------- */

export async function getStudentById(
  id: string
): Promise<Student | null> {
  try {
    const snapshot = await getDoc(
      doc(
        db,
        "students",
        id
      )
    );

    if (!snapshot.exists()) {
      return null;
    }

    return {
      ...(snapshot.data() as Omit<
        Student,
        "id"
      >),

      id: snapshot.id,
    };

  } catch (error) {
    console.error(
      "getStudentById() failed:",
      error
    );

    throw error;
  }
}

/* -----------------------------------------
   UPDATE STUDENT
----------------------------------------- */

export async function updateStudent(
  id: string,
  data: Partial<StudentFormData>
): Promise<void> {
  try {
    const updatedData = removeUndefined({
      ...(data.fullName !== undefined && {
        fullName:
          data.fullName.trim(),
      }),

      ...(data.guardianName !== undefined && {
        guardianName:
          data.guardianName.trim(),
      }),

      ...(data.guardianPhone !== undefined && {
        guardianPhone:
          data.guardianPhone.trim(),
      }),

      ...(data.guardianEmail !== undefined && {
        guardianEmail:
          data.guardianEmail.trim(),
      }),

      ...(data.status !== undefined && {
        status: data.status,
      }),

      ...(data.address !== undefined && {
        address:
          data.address.trim(),
      }),

      ...(data.joiningDateBS !== undefined && {
        joiningDateBS:
          data.joiningDateBS.trim(),
      }),

      ...(data.note !== undefined && {
        note:
          data.note.trim(),
      }),

      updatedAt:
        serverTimestamp(),
    });

    await updateDoc(
      doc(
        db,
        "students",
        id
      ),
      updatedData
    );

  } catch (error) {
    console.error(
      "updateStudent() failed:",
      error
    );

    throw error;
  }
}

/* -----------------------------------------
   DELETE STUDENT
----------------------------------------- */

export async function deleteStudent(
  id: string
): Promise<void> {
  try {
    await deleteDoc(
      doc(
        db,
        "students",
        id
      )
    );

  } catch (error) {
    console.error(
      "deleteStudent() failed:",
      error
    );

    throw error;
  }
}