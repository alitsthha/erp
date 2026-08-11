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

import { generateStaffCode } from "./staff-code.service";

import type { Staff } from "../types/staff.types";
import type { StaffFormData } from "../schemas/staff.schema";

export async function addStaff(
  data: StaffFormData
): Promise<string> {
  const staffCode = await generateStaffCode();

  const docRef = await addDoc(collection(db, "staff"), {
    ...data,
    staffCode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function getStaff(): Promise<Staff[]> {
  const q = query(
    collection(db, "staff"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Omit<Staff, "id">;

    return {
      ...data,
      id: docSnap.id,
    };
  });
}

export async function getStaffById(
  id: string
): Promise<Staff | null> {
  const snapshot = await getDoc(doc(db, "staff", id));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as Omit<Staff, "id">;

  return {
    ...data,
    id: snapshot.id,
  };
}

export async function updateStaff(
  id: string,
  data: Partial<StaffFormData>
): Promise<void> {
  await updateDoc(doc(db, "staff", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteStaff(
  id: string
): Promise<void> {
  await deleteDoc(doc(db, "staff", id));
}