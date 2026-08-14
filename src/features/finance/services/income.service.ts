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
import { generateCode } from "@/lib/generateCode";

import type { Income, IncomeFormData } from "../types/income.types";

const COLLECTION = "financeIncome";

/* =========================================================
   HELPERS
========================================================= */

function mapIncome(
  id: string,
  data: Record<string, unknown>
): Income {
  return {
    id,
    incomeNumber: String(data.incomeNumber ?? ""),
    category: (data.category as Income["category"]) ?? "Other",
    description: String(data.description ?? ""),
    amount: Number(data.amount ?? 0),
    incomeDate: String(data.incomeDate ?? ""),
    source: data.source ? String(data.source) : undefined,
    accountId: data.accountId ? String(data.accountId) : undefined,
    accountName: data.accountName ? String(data.accountName) : undefined,
    paymentMethod: data.paymentMethod ? String(data.paymentMethod) : undefined,
    referenceNumber: data.referenceNumber ? String(data.referenceNumber) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/* =========================================================
   CREATE INCOME
========================================================= */

export async function createIncome(
  data: IncomeFormData
): Promise<string> {
  const incomeNumber = await generateCode(
    "financeIncome",
    "INC"
  );

  const docRef = await addDoc(
    collection(db, COLLECTION),
    {
      ...data,
      incomeNumber,
      amount: Number(data.amount),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return docRef.id;
}

/* =========================================================
   GET ALL INCOME
========================================================= */

export async function getIncomes(): Promise<Income[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) =>
      mapIncome(docSnap.id, docSnap.data() as Record<string, unknown>)
    );
  } catch {
    return [];
  }
}

/* =========================================================
   GET INCOME BY ID
========================================================= */

export async function getIncomeById(
  id: string
): Promise<Income | null> {
  if (!id) return null;

  try {
    const docSnap = await getDoc(doc(db, COLLECTION, id));

    if (!docSnap.exists()) return null;

    return mapIncome(
      docSnap.id,
      docSnap.data() as Record<string, unknown>
    );
  } catch {
    return null;
  }
}

/* =========================================================
   UPDATE INCOME
========================================================= */

export async function updateIncome(
  id: string,
  data: Partial<IncomeFormData>
): Promise<void> {
  if (!id) throw new Error("Income ID is required");

  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/* =========================================================
   DELETE INCOME
========================================================= */

export async function deleteIncome(id: string): Promise<void> {
  if (!id) throw new Error("Income ID is required");

  await deleteDoc(doc(db, COLLECTION, id));
}
