import {
  addDoc,
  collection,
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
import { recordFinancialAudit } from "./financial-audit.service";
import { updateFinancialRecord } from "./financial-concurrency.service";

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
    category:
      data.category === "Student Fee" || data.category === "Student Fee (Advance)"
        ? (data.category as Income["category"])
        : "Student Fee",
    description: String(data.description ?? ""),
    amount: Number(data.amount ?? 0),
    incomeDate: String(data.incomeDate ?? ""),
    source: data.source ? String(data.source) : undefined,
    studentId: data.studentId ? String(data.studentId) : undefined,
    studentName: data.studentName ? String(data.studentName) : undefined,
    appliedAmount: Number(data.appliedAmount ?? 0),
    remainingAmount: Number(data.remainingAmount ?? 0),
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
      appliedAmount: Number(data.appliedAmount ?? 0),
      remainingAmount: Number(data.remainingAmount ?? Number(data.amount)),
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

    return snapshot.docs.filter((docSnap) => !docSnap.data().deletedAt).map((docSnap) =>
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
    if (docSnap.data().deletedAt) return null;

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

  await updateFinancialRecord(COLLECTION, id, data as Record<string, unknown>);
}

/* =========================================================
   DELETE INCOME
========================================================= */

export async function deleteIncome(id: string): Promise<void> {
  if (!id) throw new Error("Income ID is required");

  const incomeRef = doc(db, COLLECTION, id);
  const snapshot = await getDoc(incomeRef);
  if (!snapshot.exists()) throw new Error("Income not found");

  await updateDoc(incomeRef, {
    deletedAt: serverTimestamp(),
    deletedBy: "financial-user",
    updatedAt: serverTimestamp(),
  });
  await recordFinancialAudit("ARCHIVE", COLLECTION, id, snapshot.data());
}
