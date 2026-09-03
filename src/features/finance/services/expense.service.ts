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

import type { Expense, ExpenseFormData } from "../types/expense.types";
import { recordFinancialAudit } from "./financial-audit.service";
import { updateFinancialRecord } from "./financial-concurrency.service";

const COLLECTION = "financeExpenses";

/* =========================================================
   HELPERS
========================================================= */

function mapExpense(
  id: string,
  data: Record<string, unknown>
): Expense {
  return {
    id,
    expenseNumber: String(data.expenseNumber ?? ""),
    category: (data.category as Expense["category"]) ?? "Other",
    description: String(data.description ?? ""),
    amount: Number(data.amount ?? 0),
    expenseDate: String(data.expenseDate ?? ""),
    vendor: data.vendor ? String(data.vendor) : undefined,
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
   CREATE EXPENSE
========================================================= */

export async function createExpense(
  data: ExpenseFormData
): Promise<string> {
  const expenseNumber = await generateCode(
    "financeExpenses",
    "EXP"
  );

  const cleanPayload = Object.fromEntries(
    Object.entries({
      ...data,
      expenseNumber,
      amount: Number(data.amount),
      category: data.category,
      description: data.description?.trim(),
      expenseDate: data.expenseDate,
      vendor: data.vendor?.trim() || undefined,
      paymentMethod: data.paymentMethod?.trim() || undefined,
      referenceNumber: data.referenceNumber?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

  const docRef = await addDoc(
    collection(db, COLLECTION),
    cleanPayload
  );

  return docRef.id;
}

/* =========================================================
   GET ALL EXPENSES
========================================================= */

export async function getExpenses(): Promise<Expense[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.filter((docSnap) => !docSnap.data().deletedAt).map((docSnap) =>
      mapExpense(docSnap.id, docSnap.data() as Record<string, unknown>)
    );
  } catch {
    return [];
  }
}

/* =========================================================
   GET EXPENSE BY ID
========================================================= */

export async function getExpenseById(
  id: string
): Promise<Expense | null> {
  if (!id) return null;

  try {
    const docSnap = await getDoc(doc(db, COLLECTION, id));

    if (!docSnap.exists()) return null;
    if (docSnap.data().deletedAt) return null;

    return mapExpense(
      docSnap.id,
      docSnap.data() as Record<string, unknown>
    );
  } catch {
    return null;
  }
}

/* =========================================================
   UPDATE EXPENSE
========================================================= */

export async function updateExpense(
  id: string,
  data: Partial<ExpenseFormData>
): Promise<void> {
  if (!id) throw new Error("Expense ID is required");

  await updateFinancialRecord(COLLECTION, id, data as Record<string, unknown>);
}

/* =========================================================
   DELETE EXPENSE
========================================================= */

export async function deleteExpense(id: string): Promise<void> {
  if (!id) throw new Error("Expense ID is required");

  const expenseRef = doc(db, COLLECTION, id);
  const snapshot = await getDoc(expenseRef);
  if (!snapshot.exists()) throw new Error("Expense not found");

  await updateDoc(expenseRef, {
    deletedAt: serverTimestamp(),
    deletedBy: "financial-user",
    updatedAt: serverTimestamp(),
  });
  await recordFinancialAudit("ARCHIVE", COLLECTION, id, snapshot.data());
}
