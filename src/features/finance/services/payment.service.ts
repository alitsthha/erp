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
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { generateCode } from "@/lib/generateCode";

import {
  getInvoiceById,
  updateInvoicePaymentState,
} from "./invoice.service";

import type { Payment } from "../types/payment.types";
import { recordFinancialAudit } from "./financial-audit.service";

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
  const invoiceRef = doc(db, "invoices", data.invoiceId);
  const paymentRef = doc(collection(db, COLLECTION));
  const incomeRef = doc(db, "financeIncome", `PAYMENT-${paymentRef.id}`);

  await runTransaction(db, async (transaction) => {
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
  });

  return paymentRef.id;
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

  let transactionAttempts = 0;
  await runTransaction(db, async (transaction) => {
    transactionAttempts += 1;
    const paymentSnapshot = await transaction.get(doc(db, COLLECTION, id));
    if (!paymentSnapshot.exists() || paymentSnapshot.data().deletedAt) {
      throw new Error("Payment not found.");
    }
    if (transactionAttempts > 1) {
      throw new Error(
        "This payment was changed by another user. Reload it before saving again."
      );
    }

    transaction.update(doc(db, COLLECTION, id), {
      ...data,
      amount: newAmount,
      updatedAt: serverTimestamp(),
    });
  });

  if (oldInvoiceId) {
    const oldInvoice = await getInvoiceById(oldInvoiceId);
    if (oldInvoice) {
      const restoredAmount = Math.max(oldInvoice.paidAmount - oldAmount, 0);
      await updateInvoicePaymentState(oldInvoiceId, restoredAmount);
    }
  }

  if (newInvoiceId) {
    const newInvoice = await getInvoiceById(newInvoiceId);
    if (newInvoice) {
      const newPaidAmount = newInvoice.paidAmount + newAmount;
      await updateInvoicePaymentState(newInvoiceId, newPaidAmount);
    }
  }
}

export async function deletePayment(id: string): Promise<void> {
  if (!id) throw new Error("Payment ID is required.");

  const payment = await getPaymentById(id);
  if (!payment) throw new Error("Payment not found.");

  const paymentRef = doc(db, COLLECTION, id);
  await updateDoc(paymentRef, {
    status: "cancelled",
    deletedAt: serverTimestamp(),
    deletedBy: "financial-user",
    updatedAt: serverTimestamp(),
  });
  const incomeSnapshot = await getDocs(
    query(collection(db, "financeIncome"), where("paymentId", "==", id))
  );
  await Promise.all(
    incomeSnapshot.docs.map(async (incomeDoc) => {
      await updateDoc(incomeDoc.ref, {
        deletedAt: serverTimestamp(),
        deletedBy: "financial-user",
        updatedAt: serverTimestamp(),
      });
      await recordFinancialAudit("ARCHIVE", "financeIncome", incomeDoc.id, incomeDoc.data());
    })
  );
  await recordFinancialAudit("ARCHIVE", COLLECTION, id, {
    ...payment,
    status: "cancelled",
  });

  if (payment.invoiceId) {
    const invoice = await getInvoiceById(payment.invoiceId);
    if (invoice) {
      const newPaidAmount = Math.max(invoice.paidAmount - payment.amount, 0);
      await updateInvoicePaymentState(payment.invoiceId, newPaidAmount);
    }
  }
}