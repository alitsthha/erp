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
  where,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import type {
  Invoice,
  InvoiceLine,
  InvoiceStatus,
} from "../types/invoice.types";

import {
  calculateStudentMonthlyFee,
} from "./fee-calculation.service";

/* =========================================================
   COLLECTION
========================================================= */

const COLLECTION_NAME =
  "invoices";

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

function toString(
  value: unknown
): string {
  return typeof value === "string"
    ? value
    : "";
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

/* =========================================================
   MAP INVOICE
========================================================= */

function mapInvoice(
  id: string,
  data: Record<string, unknown>
): Invoice {
  return {
    id,

    invoiceNumber:
      toString(
        data.invoiceNumber
      ),

    studentId:
      toString(
        data.studentId
      ),

    studentName:
      toString(
        data.studentName
      ),

    studentCode:
      toString(
        data.studentCode
      ),

    billingMonth:
      toString(
        data.billingMonth
      ),

    invoiceDate:
      toString(
        data.invoiceDate
      ),

    dueDate:
      data.dueDate
        ? toString(data.dueDate)
        : undefined,

    lines:
      Array.isArray(data.lines)
        ? (data.lines as InvoiceLine[])
        : [],

    subtotal:
      toNumber(
        data.subtotal
      ),

    discount:
      toNumber(
        data.discount
      ),

    totalAmount:
      toNumber(
        data.totalAmount
      ),

    paidAmount:
      toNumber(
        data.paidAmount
      ),

    dueAmount:
      toNumber(
        data.dueAmount
      ),

    status:
      data.status === "Paid" ||
      data.status ===
        "Partially Paid" ||
      data.status === "Unpaid" ||
      data.status === "Cancelled"
        ? data.status
        : "Draft",

    notes:
      data.notes
        ? toString(data.notes)
        : undefined,

    createdAt:
      data.createdAt,

    updatedAt:
      data.updatedAt,
  };
}

/* =========================================================
   STATUS
========================================================= */

function calculateInvoiceStatus(
  totalAmount: number,
  paidAmount: number
): InvoiceStatus {
  const total =
    roundMoney(
      Math.max(
        0,
        totalAmount
      )
    );

  const paid =
    roundMoney(
      Math.max(
        0,
        paidAmount
      )
    );

  if (total <= 0) {
    return "Draft";
  }

  if (paid >= total) {
    return "Paid";
  }

  if (paid > 0) {
    return "Partially Paid";
  }

  return "Unpaid";
}

/* =========================================================
   INVOICE NUMBER
========================================================= */

async function generateInvoiceNumber(): Promise<string> {
  const snapshot =
    await getDocs(
      collection(
        db,
        COLLECTION_NAME
      )
    );

  let highestNumber = 0;

  snapshot.forEach(
    (invoiceDoc) => {
      const invoiceNumber =
        toString(
          invoiceDoc.data().invoiceNumber
        );

      const match =
        invoiceNumber.match(
          /(?:INV[-\s]*)?(\d+)/i
        );

      if (!match) {
        return;
      }

      const parsedNumber =
        Number(match[1]);

      if (
        Number.isFinite(parsedNumber) &&
        parsedNumber > highestNumber
      ) {
        highestNumber = parsedNumber;
      }
    }
  );

  return `INV-${String(
    highestNumber + 1
  ).padStart(3, "0")}`;
}

/* =========================================================
   CREATE INVOICE FROM ATTENDANCE
========================================================= */

export async function createInvoiceFromStudentFee(
  studentId: string,
  billingMonth: string,
  options?: {
    discount?: number;
    dueDate?: string;
    invoiceDate?: string;
    notes?: string;
  }
): Promise<string> {
  if (!studentId) {
    throw new Error(
      "Student ID is required."
    );
  }

  if (!billingMonth) {
    throw new Error(
      "Billing month is required."
    );
  }

  /*
   * Attendance → Fee Calculation
   */
  const feeSummary =
    await calculateStudentMonthlyFee(
      studentId,
      billingMonth
    );

  if (!feeSummary.studentId) {
    throw new Error(
      "Student fee information could not be found."
    );
  }

  if (
    feeSummary.lines.length === 0
  ) {
    throw new Error(
      "No active enrollment found for this student."
    );
  }

  if (
    feeSummary.totalAmount <= 0
  ) {
    throw new Error(
      "The calculated invoice amount is Rs. 0."
    );
  }

  /*
   * Prevent duplicate invoice
   * for same student + billing month.
   */
  const existing =
    await getInvoiceByStudentAndMonth(
      studentId,
      billingMonth
    );

  if (existing) {
    throw new Error(
      `Invoice ${existing.invoiceNumber} already exists for this billing month.`
    );
  }

  const invoiceNumber =
    await generateInvoiceNumber();

  const invoiceDate =
    options?.invoiceDate ??
    new Date()
      .toISOString()
      .substring(0, 10);

  const discount =
    roundMoney(
      Math.max(
        0,
        toNumber(
          options?.discount
        )
      )
    );

  const subtotal =
    roundMoney(
      feeSummary.lines.reduce(
        (total, line) =>
          total +
          toNumber(
            line.calculatedAmount
          ),
        0
      )
    );

  const totalAmount =
    roundMoney(
      Math.max(
        subtotal -
          discount,
        0
      )
    );

  const paidAmount = 0;

  const dueAmount =
    roundMoney(
      Math.max(
        totalAmount -
          paidAmount,
        0
      )
    );

  const status =
    calculateInvoiceStatus(
      totalAmount,
      paidAmount
    );

  /*
   * Freeze the attendance/fee
   * calculation into invoice lines.
   */
  const lines:
    InvoiceLine[] =
      feeSummary.lines.map(
        (line) => ({
          enrollmentId:
            line.enrollmentId,

          activityId:
            line.activityId,

          activityName:
            line.activityName,

          activityCode:
            line.activityCode,

          monthlyFee:
            roundMoney(
              line.monthlyFee
            ),

          expectedSessions:
            Math.max(
              0,
              Math.floor(
                line.expectedSessions
              )
            ),

          sessionCount:
            Math.max(
              0,
              Math.floor(
                line.attendedSessions
              )
            ),

          sessionFee:
            roundMoney(
              line.sessionFee
            ),

          amount:
            roundMoney(
              line.calculatedAmount
            ),
        })
      );

  const invoiceData = {
    invoiceNumber,

    studentId:
      feeSummary.studentId,

    studentName:
      feeSummary.studentName,

    studentCode:
      feeSummary.studentCode,

    billingMonth,

    invoiceDate,

    dueDate:
      options?.dueDate ?? "",

    lines,

    subtotal,

    discount,

    totalAmount,

    paidAmount,

    dueAmount,

    status,

    notes:
      options?.notes ?? "",

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  };

  const invoiceRef =
    await addDoc(
      collection(
        db,
        COLLECTION_NAME
      ),
      invoiceData
    );

  return invoiceRef.id;
}

/* =========================================================
   ALIAS FOR FORM
========================================================= */

export async function generateInvoiceFromAttendance(
  studentId: string,
  billingMonth: string,
  options?: {
    discount?: number;
    dueDate?: string;
    invoiceDate?: string;
    notes?: string;
  }
): Promise<string> {
  return createInvoiceFromStudentFee(
    studentId,
    billingMonth,
    options
  );
}

/* =========================================================
   GET BY ID
========================================================= */

export async function getInvoiceById(
  invoiceId: string
): Promise<Invoice | null> {
  if (!invoiceId) {
    return null;
  }

  const snapshot =
    await getDoc(
      doc(
        db,
        COLLECTION_NAME,
        invoiceId
      )
    );

  if (!snapshot.exists()) {
    return null;
  }

  return mapInvoice(
    snapshot.id,
    snapshot.data() as Record<
      string,
      unknown
    >
  );
}

/* =========================================================
   GET ALL
========================================================= */

export async function getInvoices(): Promise<
  Invoice[]
> {
  const q =
    query(
      collection(
        db,
        COLLECTION_NAME
      ),
      orderBy(
        "invoiceNumber",
        "desc"
      )
    );

  const snapshot =
    await getDocs(q);

  return snapshot.docs.map(
    (invoiceDoc) =>
      mapInvoice(
        invoiceDoc.id,
        invoiceDoc.data() as Record<
          string,
          unknown
        >
      )
  );
}

/* =========================================================
   GET BY STUDENT
========================================================= */

export async function getInvoicesByStudentId(
  studentId: string
): Promise<Invoice[]> {
  if (!studentId) {
    return [];
  }

  const q =
    query(
      collection(
        db,
        COLLECTION_NAME
      ),
      where(
        "studentId",
        "==",
        studentId
      )
    );

  const snapshot =
    await getDocs(q);

  return snapshot.docs
    .map(
      (invoiceDoc) =>
        mapInvoice(
          invoiceDoc.id,
          invoiceDoc.data() as Record<
            string,
            unknown
          >
        )
    )
    .sort(
      (a, b) =>
        b.invoiceDate.localeCompare(
          a.invoiceDate
        )
    );
}

/* =========================================================
   GET BY MONTH
========================================================= */

export async function getInvoicesByMonth(
  billingMonth: string
): Promise<Invoice[]> {
  if (!billingMonth) {
    return [];
  }

  const q =
    query(
      collection(
        db,
        COLLECTION_NAME
      ),
      where(
        "billingMonth",
        "==",
        billingMonth
      )
    );

  const snapshot =
    await getDocs(q);

  return snapshot.docs.map(
    (invoiceDoc) =>
      mapInvoice(
        invoiceDoc.id,
        invoiceDoc.data() as Record<
          string,
          unknown
        >
      )
  );
}

/* =========================================================
   GET STUDENT + MONTH
========================================================= */

export async function getInvoiceByStudentAndMonth(
  studentId: string,
  billingMonth: string
): Promise<Invoice | null> {
  if (
    !studentId ||
    !billingMonth
  ) {
    return null;
  }

  const q =
    query(
      collection(
        db,
        COLLECTION_NAME
      ),
      where(
        "studentId",
        "==",
        studentId
      ),
      where(
        "billingMonth",
        "==",
        billingMonth
      )
    );

  const snapshot =
    await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const invoiceDoc =
    snapshot.docs[0];

  return mapInvoice(
    invoiceDoc.id,
    invoiceDoc.data() as Record<
      string,
      unknown
    >
  );
}

/* =========================================================
   UPDATE INVOICE
========================================================= */

export async function updateInvoice(
  invoiceId: string,
  data: Partial<
    Omit<
      Invoice,
      | "id"
      | "invoiceNumber"
      | "createdAt"
    >
  >
): Promise<void> {
  if (!invoiceId) {
    throw new Error(
      "Invoice ID is required."
    );
  }

  await updateDoc(
    doc(
      db,
      COLLECTION_NAME,
      invoiceId
    ),
    {
      ...data,

      updatedAt:
        serverTimestamp(),
    }
  );
}

/* =========================================================
   UPDATE PAYMENT STATE
========================================================= */

export async function updateInvoicePaymentState(
  invoiceId: string,
  paidAmount: number
): Promise<void> {
  const invoice =
    await getInvoiceById(
      invoiceId
    );

  if (!invoice) {
    throw new Error(
      "Invoice not found."
    );
  }

  const safePaidAmount =
    roundMoney(
      Math.max(
        0,
        toNumber(paidAmount)
      )
    );

  if (
    safePaidAmount >
    invoice.totalAmount
  ) {
    throw new Error(
      "Payment cannot be greater than invoice total."
    );
  }

  const dueAmount =
    roundMoney(
      Math.max(
        invoice.totalAmount -
          safePaidAmount,
        0
      )
    );

  const status =
    calculateInvoiceStatus(
      invoice.totalAmount,
      safePaidAmount
    );

  await updateInvoice(
    invoiceId,
    {
      paidAmount:
        safePaidAmount,

      dueAmount,

      status,
    }
  );
}