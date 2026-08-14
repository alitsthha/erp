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
  where,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import { generateCode } from "@/lib/generateCode";

import {
  getInvoiceById,
  updateInvoicePaymentState,
} from "./invoice.service";

import type {
  Payment,
} from "../types/payment.types";

const COLLECTION =
  "financePayments";

/* =========================================================
   HELPERS
========================================================= */

function toNumber(
  value: unknown
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function roundMoney(
  value: number
): number {
  return (
    Math.round(
      (value + Number.EPSILON) * 100
    ) / 100
  );
}

function mapPayment(
  id: string,
  data: Record<string, unknown>
): Payment {
  const paymentMethod =
    data.paymentMethod;

  const allowedMethods =
    [
      "Cash",
      "Bank",
      "Online",
      "Card",
      "Other",
    ] as const;

  const safePaymentMethod =
    allowedMethods.includes(
      paymentMethod as Payment["paymentMethod"]
    )
      ? (paymentMethod as Payment["paymentMethod"])
      : "Cash";

  return {
    id,

    paymentNumber:
      String(
        data.paymentNumber ?? ""
      ),

    invoiceId:
      String(
        data.invoiceId ?? ""
      ),

    invoiceNumber:
      String(
        data.invoiceNumber ?? ""
      ),

    studentId:
      String(
        data.studentId ?? ""
      ),

    studentName:
      String(
        data.studentName ?? ""
      ),

    studentCode:
      String(
        data.studentCode ?? ""
      ),

    amount:
      toNumber(
        data.amount
      ),

    paymentDate:
      String(
        data.paymentDate ?? ""
      ),

    paymentMethod:
      safePaymentMethod,

    referenceNumber:
      data.referenceNumber
        ? String(
            data.referenceNumber
          )
        : undefined,

    notes:
      data.notes
        ? String(data.notes)
        : undefined,

    createdAt:
      data.createdAt,

    updatedAt:
      data.updatedAt,
  };
}

/* =========================================================
   CREATE PAYMENT
========================================================= */

export async function createPayment(
  data: Omit<
    Payment,
    | "id"
    | "paymentNumber"
    | "createdAt"
    | "updatedAt"
  >
): Promise<string> {
  if (!data.invoiceId) {
    throw new Error(
      "Invoice ID is required."
    );
  }

  const amount =
    roundMoney(
      Math.max(
        0,
        toNumber(data.amount)
      )
    );

  if (amount <= 0) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  const invoice =
    await getInvoiceById(
      data.invoiceId
    );

  if (!invoice) {
    throw new Error(
      "Invoice not found."
    );
  }

  if (
    invoice.status ===
    "Cancelled"
  ) {
    throw new Error(
      "Cannot make payment against a cancelled invoice."
    );
  }

  const remaining =
    roundMoney(
      Math.max(
        invoice.totalAmount -
          invoice.paidAmount,
        0
      )
    );

  if (amount > remaining) {
    throw new Error(
      `Payment exceeds outstanding amount of Rs. ${remaining}.`
    );
  }

  const paymentNumber =
    await generateCode(
      "financePayments",
      "PMT"
    );

  const paymentData = {
    ...data,

    amount,

    paymentNumber,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  };

  const paymentRef =
    await addDoc(
      collection(
        db,
        COLLECTION
      ),
      paymentData
    );

  /*
   * Invoice balance follows
   * successful payment creation.
   */
  await updateInvoicePaymentState(
    data.invoiceId,
    invoice.paidAmount +
      amount
  );

  return paymentRef.id;
}

/* =========================================================
   GET ALL PAYMENTS
========================================================= */

export async function getPayments(): Promise<
  Payment[]
> {
  const q =
    query(
      collection(
        db,
        COLLECTION
      ),
      orderBy(
        "createdAt",
        "desc"
      )
    );

  const snapshot =
    await getDocs(q);

  return snapshot.docs.map(
    (docSnap) =>
      mapPayment(
        docSnap.id,
        docSnap.data() as Record<
          string,
          unknown
        >
      )
  );
}

/* =========================================================
   GET PAYMENTS BY INVOICE
========================================================= */

export async function getPaymentsByInvoice(
  invoiceId: string
): Promise<Payment[]> {
  if (!invoiceId) {
    return [];
  }

  const q =
    query(
      collection(
        db,
        COLLECTION
      ),
      where(
        "invoiceId",
        "==",
        invoiceId
      )
    );

  const snapshot =
    await getDocs(q);

  return snapshot.docs.map(
    (docSnap) =>
      mapPayment(
        docSnap.id,
        docSnap.data() as Record<
          string,
          unknown
        >
      )
  );
}

/* =========================================================
   GET PAYMENT BY ID
========================================================= */

export async function getPaymentById(
  id: string
): Promise<Payment | null> {
  if (!id) {
    return null;
  }

  const snapshot =
    await getDoc(
      doc(
        db,
        COLLECTION,
        id
      )
    );

  if (!snapshot.exists()) {
    return null;
  }

  return mapPayment(
    snapshot.id,
    snapshot.data() as Record<
      string,
      unknown
    >
  );
}

/* =========================================================
   UPDATE PAYMENT
========================================================= */

export async function updatePayment(
  id: string,
  data: Partial<
    Omit<
      Payment,
      | "id"
      | "paymentNumber"
      | "createdAt"
    >
  >
): Promise<void> {
  if (!id) {
    throw new Error(
      "Payment ID is required."
    );
  }

  const existing =
    await getPaymentById(id);

  if (!existing) {
    throw new Error(
      "Payment not found."
    );
  }

  /*
   * If amount or invoice changes,
   * recalculate affected invoices.
   */
  const oldAmount =
    existing.amount;

  const newAmount =
    data.amount !== undefined
      ? roundMoney(
          Math.max(
            0,
            toNumber(
              data.amount
            )
          )
        )
      : oldAmount;

  const oldInvoiceId =
    existing.invoiceId;

  const newInvoiceId =
    data.invoiceId ??
    oldInvoiceId;

  if (
    newAmount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  /*
   * Update payment document.
   */
  await updateDoc(
    doc(
      db,
      COLLECTION,
      id
    ),
    {
      ...data,

      amount:
        newAmount,

      updatedAt:
        serverTimestamp(),
    }
  );

  /*
   * Recalculate old invoice.
   */
  if (oldInvoiceId) {
    const oldInvoice =
      await getInvoiceById(
        oldInvoiceId
      );

    if (oldInvoice) {
      const restoredAmount =
        Math.max(
          oldInvoice.paidAmount -
            oldAmount,
          0
        );

      await updateInvoicePaymentState(
        oldInvoiceId,
        restoredAmount
      );
    }
  }

  /*
   * Apply payment to new invoice.
   */
  const newInvoice =
    await getInvoiceById(
      newInvoiceId
    );

  if (newInvoice) {
    const newPaidAmount =
      newInvoice.paidAmount +
      newAmount;

    await updateInvoicePaymentState(
      newInvoiceId,
      newPaidAmount
    );
  }
}

/* =========================================================
   DELETE PAYMENT
========================================================= */

export async function deletePayment(
  id: string
): Promise<void> {
  if (!id) {
    throw new Error(
      "Payment ID is required."
    );
  }

  const payment =
    await getPaymentById(id);

  if (!payment) {
    throw new Error(
      "Payment not found."
    );
  }

  /*
   * Delete payment first.
   */
  await deleteDoc(
    doc(
      db,
      COLLECTION,
      id
    )
  );

  /*
   * Reverse payment from invoice.
   */
  if (payment.invoiceId) {
    const invoice =
      await getInvoiceById(
        payment.invoiceId
      );

    if (invoice) {
      const newPaidAmount =
        Math.max(
          invoice.paidAmount -
            payment.amount,
          0
        );

      await updateInvoicePaymentState(
        payment.invoiceId,
        newPaidAmount
      );
    }
  }
}