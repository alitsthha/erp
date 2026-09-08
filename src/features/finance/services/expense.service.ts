import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { generateCode } from "@/lib/generateCode";

import type { Expense, ExpenseFormData } from "../types/expense.types";
import { recordFinancialAudit } from "./financial-audit.service";
import { bankAccount, cashAccount, generalExpenseAccount, getAccountsForPosting, postAccountingEntryInTransaction, salaryExpenseAccount } from "@/features/accounting/services/accounting-posting.service";
import { runTransaction } from "firebase/firestore";

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
  const entryNumber = await generateCode("journalEntries", "JE");
  const accounts = await getAccountsForPosting();

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

  const docRef = doc(collection(db, COLLECTION));
  const entryRef = doc(collection(db, "journalEntries"));

  await runTransaction(db, async (transaction) => {
    await postAccountingEntryInTransaction(
      transaction,
      accounts,
      entryRef,
      entryNumber,
      {
        date: data.expenseDate,
        description: data.description,
        reference: expenseNumber,
        amount: Number(data.amount),
        debit: (postingAccounts) => data.category === "Salaries" ? salaryExpenseAccount(postingAccounts) : generalExpenseAccount(postingAccounts),
        credit: (postingAccounts) => data.paymentMethod?.toLowerCase().includes("bank") ? bankAccount(postingAccounts) : cashAccount(postingAccounts),
      },
    );
    transaction.set(docRef, cleanPayload);
  });

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

  const existing = await getExpenseById(id);
  if (!existing) throw new Error("Expense not found");
  const oldAmount = Number(existing.amount ?? 0);
  const newAmount = data.amount === undefined ? oldAmount : Number(data.amount);
  const accounts = await getAccountsForPosting();
  const reversalEntryNumber = await generateCode("journalEntries", "JE");
  const replacementEntryNumber = await generateCode("journalEntries", "JE");
  const reversalEntryRef = doc(collection(db, "journalEntries"));
  const replacementEntryRef = doc(collection(db, "journalEntries"));
  const suffix = Date.now();

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(doc(db, COLLECTION, id));
    if (!snapshot.exists() || snapshot.data().deletedAt) throw new Error("Expense not found");
    const current = snapshot.data();
    if (oldAmount > 0) {
      await postAccountingEntryInTransaction(transaction, accounts, reversalEntryRef, reversalEntryNumber, {
        date: String(current.expenseDate ?? ""),
        description: `Reverse updated expense ${String(current.expenseNumber ?? id)}`,
        reference: `${id}-UPDATE-REVERSAL-${suffix}`,
        amount: Number(current.amount ?? 0),
        debit: (postingAccounts) => String(current.category ?? "") === "Salaries" ? salaryExpenseAccount(postingAccounts) : generalExpenseAccount(postingAccounts),
        credit: (postingAccounts) => String(current.paymentMethod ?? "Cash").toLowerCase().includes("bank") ? bankAccount(postingAccounts) : cashAccount(postingAccounts),
      });
    }
    if (newAmount > 0) {
      await postAccountingEntryInTransaction(transaction, accounts, replacementEntryRef, replacementEntryNumber, {
        date: String(data.expenseDate ?? current.expenseDate ?? ""),
        description: `Repost updated expense ${String(current.expenseNumber ?? id)}`,
        reference: `${id}-UPDATE-${suffix}`,
        amount: newAmount,
        debit: (postingAccounts) => String(data.category ?? current.category ?? "") === "Salaries" ? salaryExpenseAccount(postingAccounts) : generalExpenseAccount(postingAccounts),
        credit: (postingAccounts) => String(data.paymentMethod ?? current.paymentMethod ?? "Cash").toLowerCase().includes("bank") ? bankAccount(postingAccounts) : cashAccount(postingAccounts),
      });
    }
    transaction.update(doc(db, COLLECTION, id), { ...data, amount: newAmount, updatedAt: serverTimestamp() });
  });
}

/* =========================================================
   DELETE EXPENSE
========================================================= */

export async function deleteExpense(id: string): Promise<void> {
  if (!id) throw new Error("Expense ID is required");

  const expenseRef = doc(db, COLLECTION, id);
  const snapshot = await getDoc(expenseRef);
  if (!snapshot.exists()) throw new Error("Expense not found");

  const accounts = await getAccountsForPosting();
  const entryNumber = await generateCode("journalEntries", "JE");
  const entryRef = doc(collection(db, "journalEntries"));
  await runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(expenseRef);
    if (!currentSnapshot.exists() || currentSnapshot.data().deletedAt) throw new Error("Expense not found");
    const current = currentSnapshot.data();
    if (Number(current.amount ?? 0) > 0) {
      await postAccountingEntryInTransaction(transaction, accounts, entryRef, entryNumber, {
        date: String(current.expenseDate ?? ""),
        description: `Reverse deleted expense ${String(current.expenseNumber ?? id)}`,
        reference: `${id}-DELETE-REVERSAL`,
        amount: Number(current.amount ?? 0),
        debit: (postingAccounts) => String(current.category ?? "") === "Salaries" ? salaryExpenseAccount(postingAccounts) : generalExpenseAccount(postingAccounts),
        credit: (postingAccounts) => String(current.paymentMethod ?? "Cash").toLowerCase().includes("bank") ? bankAccount(postingAccounts) : cashAccount(postingAccounts),
      });
    }
    transaction.update(expenseRef, { deletedAt: serverTimestamp(), deletedBy: "financial-user", updatedAt: serverTimestamp() });
  });
  await recordFinancialAudit("ARCHIVE", COLLECTION, id, snapshot.data());
}
