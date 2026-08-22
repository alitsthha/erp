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

import type { SalaryConfig } from "../types/salaryConfig.types";
import type { SalaryConfigFormData } from "../schemas/salaryConfig.schema";

export async function addSalaryConfig(
  data: SalaryConfigFormData
): Promise<string> {
  const docRef = await addDoc(
    collection(db, "salaryConfigs"),
    {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return docRef.id;
}

export async function getSalaryConfigs(): Promise<
  SalaryConfig[]
> {
  const q = query(
    collection(db, "salaryConfigs"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as Omit<
      SalaryConfig,
      "id"
    >),
    staffId: String(docSnap.data().staffId ?? ""),
    staffName: String(docSnap.data().staffName ?? ""),
    id: docSnap.id,
  }));
}

export async function getSalaryConfigById(
  id: string
): Promise<SalaryConfig | null> {
  const snapshot = await getDoc(
    doc(db, "salaryConfigs", id)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    ...(snapshot.data() as Omit<
      SalaryConfig,
      "id"
    >),
    id: snapshot.id,
  };
}

export async function updateSalaryConfig(
  id: string,
  data: Partial<SalaryConfigFormData>
) {
  await updateDoc(doc(db, "salaryConfigs", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSalaryConfig(
  id: string
) {
  await deleteDoc(doc(db, "salaryConfigs", id));
}