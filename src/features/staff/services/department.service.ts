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

import type { Department } from "../types/department.types";
import type { DepartmentFormData } from "../schemas/department.schema";

export async function addDepartment(
  data: DepartmentFormData
): Promise<string> {
  const docRef = await addDoc(
    collection(db, "departments"),
    {
      ...data,
      staffCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return docRef.id;
}
export async function getDepartments(): Promise<Department[]> {
  const q = query(
    collection(db, "departments"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as Omit<Department, "id">),
    id: docSnap.id,
  }));
}

export async function getDepartmentById(
  id: string
): Promise<Department | null> {
  const snapshot = await getDoc(
    doc(db, "departments", id)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    ...(snapshot.data() as Omit<Department, "id">),
    id: snapshot.id,
  };
}

export async function updateDepartment(
  id: string,
  data: Partial<DepartmentFormData>
) {
  await updateDoc(doc(db, "departments", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDepartment(id: string) {
  await deleteDoc(doc(db, "departments", id));
}
