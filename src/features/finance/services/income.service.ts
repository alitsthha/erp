import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { generateCode } from "@/lib/generateCode";

import type { Income, IncomeFormData } from "../types/income.types";
import { recordFinancialAudit } from "./financial-audit.service";
import { bankAccount, cashAccount, getAccountsForPosting, postAccountingEntryInTransaction, studentFeeIncomeAccount } from "@/features/accounting/services/accounting-posting.service";

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
  const entryNumber = await generateCode("journalEntries", "JE");
  const accounts = await getAccountsForPosting();
  const incomeRef = doc(collection(db, COLLECTION));
  const entryRef = doc(collection(db, "journalEntries"));

  await runTransaction(db, async (transaction) => {
    await postAccountingEntryInTransaction(transaction, accounts, entryRef, entryNumber, {
      date: data.incomeDate,
      description: data.description,
      reference: incomeNumber,
      amount: Number(data.amount),
      debit: (postingAccounts) => data.paymentMethod?.toLowerCase().includes("bank") ? bankAccount(postingAccounts) : cashAccount(postingAccounts),
      credit: studentFeeIncomeAccount,
    });
    transaction.set(incomeRef, {
      ...data,
      incomeNumber,
      amount: Number(data.amount),
      appliedAmount: Number(data.appliedAmount ?? 0),
      remainingAmount: Number(data.remainingAmount ?? Number(data.amount)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return incomeRef.id;
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

  const existing = await getIncomeById(id);
  if (!existing) throw new Error("Income not found");
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
    if (!snapshot.exists() || snapshot.data().deletedAt) throw new Error("Income not found");
    const current = snapshot.data();
    if (oldAmount > 0) {
      await postAccountingEntryInTransaction(transaction, accounts, reversalEntryRef, reversalEntryNumber, {
        date: String(current.incomeDate ?? ""),
        description: `Reverse updated income ${String(current.incomeNumber ?? id)}`,
        reference: `${id}-UPDATE-REVERSAL-${suffix}`,
        amount: Number(current.amount ?? 0),
        debit: studentFeeIncomeAccount,
        credit: (postingAccounts) => String(current.paymentMethod ?? "Cash").toLowerCase().includes("bank") ? bankAccount(postingAccounts) : cashAccount(postingAccounts),
      });
    }
    if (newAmount > 0) {
      await postAccountingEntryInTransaction(transaction, accounts, replacementEntryRef, replacementEntryNumber, {
        date: String(data.incomeDate ?? current.incomeDate ?? ""),
        description: `Repost updated income ${String(current.incomeNumber ?? id)}`,
        reference: `${id}-UPDATE-${suffix}`,
        amount: newAmount,
        debit: (postingAccounts) => String(data.paymentMethod ?? current.paymentMethod ?? "Cash").toLowerCase().includes("bank") ? bankAccount(postingAccounts) : cashAccount(postingAccounts),
        credit: studentFeeIncomeAccount,
      });
    }
    transaction.update(doc(db, COLLECTION, id), { ...data, amount: newAmount, updatedAt: serverTimestamp() });
  });
}

/* =========================================================
   DELETE INCOME
========================================================= */

export async function deleteIncome(id: string): Promise<void> {
  if (!id) throw new Error("Income ID is required");

  const incomeRef = doc(db, COLLECTION, id);
  const snapshot = await getDoc(incomeRef);
  if (!snapshot.exists()) throw new Error("Income not found");

  const accounts = await getAccountsForPosting();
  const entryNumber = await generateCode("journalEntries", "JE");
  const entryRef = doc(collection(db, "journalEntries"));
  await runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(incomeRef);
    if (!currentSnapshot.exists() || currentSnapshot.data().deletedAt) throw new Error("Income not found");
    const current = currentSnapshot.data();
    if (Number(current.amount ?? 0) > 0) {
      await postAccountingEntryInTransaction(transaction, accounts, entryRef, entryNumber, {
        date: String(current.incomeDate ?? ""),
        description: `Reverse deleted income ${String(current.incomeNumber ?? id)}`,
        reference: `${id}-DELETE-REVERSAL`,
        amount: Number(current.amount ?? 0),
        debit: studentFeeIncomeAccount,
        credit: (postingAccounts) => String(current.paymentMethod ?? "Cash").toLowerCase().includes("bank") ? bankAccount(postingAccounts) : cashAccount(postingAccounts),
      });
    }
    transaction.update(incomeRef, { deletedAt: serverTimestamp(), deletedBy: "financial-user", updatedAt: serverTimestamp() });
  });
  await recordFinancialAudit("ARCHIVE", COLLECTION, id, snapshot.data());
}
