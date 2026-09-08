import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { generateCode } from "@/lib/generateCode";

import type { Payment } from "../types/payment.types";
import { recordFinancialAudit } from "./financial-audit.service";
import { bankAccount, cashAccount, getAccountsForPosting, postAccountingEntryInTransaction, studentFeeIncomeAccount } from "@/features/accounting/services/accounting-posting.service";

const COLLECTION = "financePayments";

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function mapPayment(id: string, data: Record<string, unknown>): Payment {
  const paymentMethod = data.paymentMethod;
  const allowedMethods = ["Cash", "Bank", "Online", "Card", "Other"] as const;
  const safePaymentMethod = allowedMethods.includes(paymentMethod as Payment["paymentMethod"])
    ? (paymentMethod as Payment["paymentMethod"])
    : "Cash";

  return {
    id,
    paymentNumber: String(data.paymentNumber ?? ""),
    invoiceId: data.invoiceId ? String(data.invoiceId) : undefined,
    invoiceNumber: data.invoiceNumber ? String(data.invoiceNumber) : undefined,
    studentId: data.studentId ? String(data.studentId) : undefined,
    studentName: data.studentName ? String(data.studentName) : undefined,
    studentCode: data.studentCode ? String(data.studentCode) : undefined,
    staffId: data.staffId ? String(data.staffId) : undefined,
    staffName: data.staffName ? String(data.staffName) : undefined,
    status:
      data.status === "pending" ||
      data.status === "paid" ||
      data.status === "cancelled"
        ? data.status
        : "pending",
    paymentType:
      data.paymentType === "monthly" ||
      data.paymentType === "bonus" ||
      data.paymentType === "advance" ||
      data.paymentType === "other"
        ? data.paymentType
        : undefined,
    amount: toNumber(data.amount),
    paymentDate: String(data.paymentDate ?? ""),
    paymentMethod: safePaymentMethod,
    referenceNumber: data.referenceNumber ? String(data.referenceNumber) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function createInvoicePayment(
  data: Omit<Payment, "id" | "paymentNumber" | "createdAt" | "updatedAt"> & { invoiceId: string }
): Promise<string> {
  const amount = roundMoney(Math.max(0, toNumber(data.amount)));

  if (!data.invoiceId) {
    throw new Error("Invoice ID is required.");
  }

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const paymentNumber = await generateCode(COLLECTION, "PMT");
  const incomeNumber = await generateCode("financeIncome", "INC");
  const entryNumber = await generateCode("journalEntries", "JE");
  const accounts = await getAccountsForPosting();
  const invoiceRef = doc(db, "invoices", data.invoiceId);
  const idempotencyRef = data.idempotencyKey
    ? doc(db, "paymentIdempotencyKeys", encodeURIComponent(data.idempotencyKey))
    : null;
  const paymentRef = doc(collection(db, COLLECTION));
  const incomeRef = doc(db, "financeIncome", `PAYMENT-${paymentRef.id}`);
  const entryRef = doc(collection(db, "journalEntries"));

  const paymentId = await runTransaction(db, async (transaction) => {
    if (idempotencyRef) {
      const idempotencySnapshot = await transaction.get(idempotencyRef);
      if (idempotencySnapshot.exists()) {
        return String(idempotencySnapshot.data().paymentId ?? "");
      }
    }

    const invoiceSnapshot = await transaction.get(invoiceRef);
    if (!invoiceSnapshot.exists() || invoiceSnapshot.data().deletedAt) {
      throw new Error("Invoice not found.");
    }

    const invoice = invoiceSnapshot.data();
    if (invoice.status === "Cancelled") {
      throw new Error("Cannot make payment against a cancelled invoice.");
    }

    const paidAmount = roundMoney(Math.max(Number(invoice.paidAmount ?? 0), 0));
    const totalAmount = roundMoney(Math.max(Number(invoice.totalAmount ?? 0), 0));
    const remaining = roundMoney(Math.max(totalAmount - paidAmount, 0));
    if (amount > remaining) {
      throw new Error(`Payment exceeds outstanding amount of Rs. ${remaining}.`);
    }

    const newPaidAmount = roundMoney(paidAmount + amount);
    const newStatus = newPaidAmount >= totalAmount
      ? "Paid"
      : newPaidAmount > 0
        ? "Partially Paid"
        : "Unpaid";

    await postAccountingEntryInTransaction(
      transaction,
      accounts,
      entryRef,
      entryNumber,
      {
        date: data.paymentDate,
        description: `Student fee payment for ${data.studentName ?? "student"}`,
        reference: paymentRef.id,
        amount,
        debit: (postingAccounts) => data.paymentMethod?.toLowerCase().includes("bank") ? bankAccount(postingAccounts) : cashAccount(postingAccounts),
        credit: studentFeeIncomeAccount,
      },
    );
    transaction.set(paymentRef, {
      ...data,
      amount,
      paymentNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(incomeRef, {
      incomeNumber,
      category: "Student Fee",
      description: `Student fee payment for ${data.studentName ?? "student"}`,
      amount,
      incomeDate: data.paymentDate,
      source: data.studentName ?? data.studentId ?? "Student",
      referenceNumber: paymentNumber,
      paymentMethod: data.paymentMethod ?? "Cash",
      notes: data.notes ?? "",
      paymentId: paymentRef.id,
      invoiceId: data.invoiceId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(invoiceRef, {
      paidAmount: newPaidAmount,
      dueAmount: roundMoney(Math.max(totalAmount - newPaidAmount, 0)),
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    if (idempotencyRef) {
      transaction.set(idempotencyRef, {
        paymentId: paymentRef.id,
        invoiceId: data.invoiceId,
        createdAt: serverTimestamp(),
      });
    }

    return paymentRef.id;
  });

  return paymentId || paymentRef.id;
}

export async function createPayment(
  data: Omit<Payment, "id" | "paymentNumber" | "createdAt" | "updatedAt">
): Promise<string> {
  if (data.invoiceId) {
    return createInvoicePayment({
      ...data,
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber ?? "",
      studentId: data.studentId ?? "",
      studentName: data.studentName ?? "",
      studentCode: data.studentCode ?? "",
      paymentMethod: data.paymentMethod ?? "Cash",
      paymentType: data.paymentType ?? "other",
      amount: toNumber(data.amount),
      paymentDate: data.paymentDate,
      notes: data.notes,
      referenceNumber: data.referenceNumber,
    });
  }

  if (!data.staffId) {
    throw new Error("Either invoiceId or staffId is required.");
  }

  const amount = roundMoney(Math.max(0, toNumber(data.amount)));
  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const paymentNumber = await generateCode(COLLECTION, "PMT");
  const paymentData = {
    ...data,
    paymentType: data.paymentType ?? "other",
    amount,
    paymentNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const paymentRef = await addDoc(collection(db, COLLECTION), paymentData);
  return paymentRef.id;
}

export async function getPayments(): Promise<Payment[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.filter((docSnap) => !docSnap.data().deletedAt).map((docSnap) => mapPayment(docSnap.id, docSnap.data() as Record<string, unknown>));
}

export async function getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
  if (!invoiceId) return [];

  const q = query(collection(db, COLLECTION), where("invoiceId", "==", invoiceId));
  const snapshot = await getDocs(q);
  return snapshot.docs.filter((docSnap) => !docSnap.data().deletedAt).map((docSnap) => mapPayment(docSnap.id, docSnap.data() as Record<string, unknown>));
}

export async function getPaymentsByStaffId(staffId: string): Promise<Payment[]> {
  if (!staffId) return [];

  const q = query(collection(db, COLLECTION), where("staffId", "==", staffId));
  const snapshot = await getDocs(q);
  return snapshot.docs.filter((docSnap) => !docSnap.data().deletedAt).map((docSnap) => mapPayment(docSnap.id, docSnap.data() as Record<string, unknown>));
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  if (!id) return null;

  const snapshot = await getDoc(doc(db, COLLECTION, id));
  if (!snapshot.exists()) return null;
  if (snapshot.data().deletedAt) return null;

  return mapPayment(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function updatePayment(
  id: string,
  data: Partial<Omit<Payment, "id" | "paymentNumber" | "createdAt">>
): Promise<void> {
  if (!id) throw new Error("Payment ID is required.");

  const existing = await getPaymentById(id);
  if (!existing) throw new Error("Payment not found.");

  const oldAmount = existing.amount;
  const newAmount =
    data.amount !== undefined
      ? roundMoney(Math.max(0, toNumber(data.amount)))
      : oldAmount;

  const oldInvoiceId = existing.invoiceId;
  const newInvoiceId = data.invoiceId ?? oldInvoiceId;

  if (newAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const shouldUpdateLedger = Boolean(oldInvoiceId || newInvoiceId);
  const accounts = shouldUpdateLedger ? await getAccountsForPosting() : [];
  const reversalEntryNumber = shouldUpdateLedger ? await generateCode("journalEntries", "JE") : "";
  const replacementEntryNumber = shouldUpdateLedger ? await generateCode("journalEntries", "JE") : "";
  const reversalEntryRef = shouldUpdateLedger ? doc(collection(db, "journalEntries")) : null;
  const replacementEntryRef = shouldUpdateLedger ? doc(collection(db, "journalEntries")) : null;
  const updateSuffix = Date.now();

  await runTransaction(db, async (transaction) => {
    const paymentSnapshot = await transaction.get(doc(db, COLLECTION, id));
    if (!paymentSnapshot.exists() || paymentSnapshot.data().deletedAt) {
      throw new Error("Payment not found.");
    }

    const payment = paymentSnapshot.data();
    const oldInvoiceSnapshot = oldInvoiceId
      ? await transaction.get(doc(db, "invoices", oldInvoiceId))
      : null;
    const newInvoiceSnapshot = newInvoiceId && newInvoiceId !== oldInvoiceId
      ? await transaction.get(doc(db, "invoices", newInvoiceId))
      : oldInvoiceSnapshot;

    if (oldInvoiceId && (!oldInvoiceSnapshot?.exists() || oldInvoiceSnapshot.data().deletedAt)) {
      throw new Error("Original invoice not found.");
    }
    if (newInvoiceId && (!newInvoiceSnapshot?.exists() || newInvoiceSnapshot.data().deletedAt)) {
      throw new Error("New invoice not found.");
    }

    const oldInvoiceData = oldInvoiceSnapshot?.exists() ? oldInvoiceSnapshot.data() : null;
    const newInvoiceData = newInvoiceSnapshot?.exists() ? newInvoiceSnapshot.data() : null;
    const oldInvoicePaid = oldInvoiceData ? roundMoney(Math.max(Number(oldInvoiceData.paidAmount ?? 0), 0)) : 0;
    const newInvoiceTotal = newInvoiceData ? roundMoney(Math.max(Number(newInvoiceData.totalAmount ?? 0), 0)) : 0;
    const resultingNewPaid = newInvoiceId === oldInvoiceId
      ? roundMoney(oldInvoicePaid - oldAmount + newAmount)
      : roundMoney((newInvoiceData ? Number(newInvoiceData.paidAmount ?? 0) : 0) + newAmount);
    if (newInvoiceId && resultingNewPaid > newInvoiceTotal) {
      throw new Error(`Payment exceeds outstanding amount of Rs. ${roundMoney(Math.max(newInvoiceTotal - Number(newInvoiceData?.paidAmount ?? 0), 0))}.`);
    }

    if (shouldUpdateLedger && reversalEntryRef && replacementEntryRef) {
      const oldMethod = String(payment.paymentMethod ?? "Cash").toLowerCase();
      await postAccountingEntryInTransaction(transaction, accounts, reversalEntryRef, reversalEntryNumber, {
        date: String(payment.paymentDate ?? data.paymentDate),
        description: `Reverse payment ${String(payment.paymentNumber ?? id)}`,
        reference: `${id}-REVERSAL-${updateSuffix}`,
        amount: oldAmount,
        debit: (postingAccounts) => studentFeeIncomeAccount(postingAccounts),
        credit: (postingAccounts) => oldMethod.includes("bank") ? bankAccount(postingAccounts) : cashAccount(postingAccounts),
      });
      await postAccountingEntryInTransaction(transaction, accounts, replacementEntryRef, replacementEntryNumber, {
        date: data.paymentDate ?? String(payment.paymentDate ?? ""),
        description: `Updated payment ${String(payment.paymentNumber ?? id)}`,
        reference: `${id}-UPDATE-${updateSuffix}`,
        amount: newAmount,
        debit: (postingAccounts) => String(data.paymentMethod ?? payment.paymentMethod ?? "Cash").toLowerCase().includes("bank") ? bankAccount(postingAccounts) : cashAccount(postingAccounts),
        credit: studentFeeIncomeAccount,
      });
    }

    transaction.update(doc(db, COLLECTION, id), {
      ...data,
      amount: newAmount,
      updatedAt: serverTimestamp(),
    });

    if (oldInvoiceId && oldInvoiceId !== newInvoiceId && oldInvoiceSnapshot) {
      const restoredAmount = roundMoney(Math.max(oldInvoicePaid - oldAmount, 0));
      transaction.update(doc(db, "invoices", oldInvoiceId), {
        paidAmount: restoredAmount,
        dueAmount: roundMoney(Math.max(Number(oldInvoiceData?.totalAmount ?? 0) - restoredAmount, 0)),
        status: restoredAmount <= 0 ? "Unpaid" : "Partially Paid",
        updatedAt: serverTimestamp(),
      });
    }
    if (newInvoiceId && newInvoiceSnapshot) {
      transaction.update(doc(db, "invoices", newInvoiceId), {
        paidAmount: resultingNewPaid,
        dueAmount: roundMoney(Math.max(newInvoiceTotal - resultingNewPaid, 0)),
        status: resultingNewPaid >= newInvoiceTotal ? "Paid" : resultingNewPaid > 0 ? "Partially Paid" : "Unpaid",
        updatedAt: serverTimestamp(),
      });
    }
  });
}

export async function deletePayment(id: string): Promise<void> {
  if (!id) throw new Error("Payment ID is required.");

  const payment = await getPaymentById(id);
  if (!payment) throw new Error("Payment not found.");

  const paymentRef = doc(db, COLLECTION, id);
  const incomeQuery = query(collection(db, "financeIncome"), where("paymentId", "==", id));
  const accounts = payment.invoiceId ? await getAccountsForPosting() : [];
  const entryNumber = payment.invoiceId ? await generateCode("journalEntries", "JE") : "";
  const entryRef = payment.invoiceId ? doc(collection(db, "journalEntries")) : null;

  const incomeSnapshot = await getDocs(incomeQuery);
  await runTransaction(db, async (transaction) => {
    const paymentSnapshot = await transaction.get(paymentRef);
    if (!paymentSnapshot.exists() || paymentSnapshot.data().deletedAt) {
      throw new Error("Payment not found.");
    }

    const invoiceSnapshot = payment.invoiceId
      ? await transaction.get(doc(db, "invoices", payment.invoiceId))
      : null;
    if (payment.invoiceId && (!invoiceSnapshot?.exists() || invoiceSnapshot.data().deletedAt)) {
      throw new Error("Invoice not found.");
    }

    if (payment.invoiceId && entryRef) {
      await postAccountingEntryInTransaction(transaction, accounts, entryRef, entryNumber, {
        date: payment.paymentDate,
        description: `Reverse deleted payment ${payment.paymentNumber}`,
        reference: `${id}-DELETE-REVERSAL`,
        amount: payment.amount,
        debit: (postingAccounts) => studentFeeIncomeAccount(postingAccounts),
        credit: (postingAccounts) => payment.paymentMethod.toLowerCase().includes("bank") ? bankAccount(postingAccounts) : cashAccount(postingAccounts),
      });
    }

    transaction.update(paymentRef, {
      status: "cancelled",
      deletedAt: serverTimestamp(),
      deletedBy: "financial-user",
      updatedAt: serverTimestamp(),
    });
    for (const incomeDoc of incomeSnapshot.docs) {
      transaction.update(incomeDoc.ref, {
        deletedAt: serverTimestamp(),
        deletedBy: "financial-user",
        updatedAt: serverTimestamp(),
      });
    }
    if (payment.invoiceId && invoiceSnapshot) {
      const invoiceData = invoiceSnapshot.exists() ? invoiceSnapshot.data() : {};
      const totalAmount = Number(invoiceData.totalAmount ?? 0);
      const paidAmount = roundMoney(Math.max(Number(invoiceData.paidAmount ?? 0) - payment.amount, 0));
      transaction.update(doc(db, "invoices", payment.invoiceId), {
        paidAmount,
        dueAmount: roundMoney(Math.max(totalAmount - paidAmount, 0)),
        status: paidAmount >= totalAmount ? "Paid" : paidAmount > 0 ? "Partially Paid" : "Unpaid",
        updatedAt: serverTimestamp(),
      });
    }
  });

  for (const incomeDoc of incomeSnapshot.docs) {
    await recordFinancialAudit("ARCHIVE", "financeIncome", incomeDoc.id, incomeDoc.data());
  }
  await recordFinancialAudit("ARCHIVE", COLLECTION, id, {
    ...payment,
    status: "cancelled",
  });
}