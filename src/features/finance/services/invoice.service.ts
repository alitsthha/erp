import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  runTransaction,
  where,
  type DocumentReference,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { getCurrentBSDate } from "@/utils/nepali-date";

import type {
  Invoice,
  InvoiceLine,
  InvoiceStatus,
} from "../types/invoice.types";

import {
  calculateStudentMonthlyFee,
} from "./fee-calculation.service";
import type {
  StudentFeeSummary,
} from "./fee-calculation.service";
import { updateFinancialRecord } from "./financial-concurrency.service";

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

/**
 * Explains why a bill came out as Rs. 0, naming the monthly due dates the user
 * has to pick as the billing date instead of just reporting a zero total.
 */
function buildNothingToBillMessage(
  feeSummary: StudentFeeSummary,
  billingDate: string
): string {
  const pendingMonthly =
    feeSummary.lines.filter(
      (line) =>
        line.countedMonthly &&
        line.monthlyFee > 0 &&
        !line.monthlyFeeApplied
    );

  if (pendingMonthly.length === 0) {
    return `There is nothing to bill on ${billingDate}: no monthly fee is due and no attended sessions were found.`;
  }

  const details =
    pendingMonthly
      .map(
        (line) =>
          `${line.activityName || "Activity"} is due on ${
            line.monthlyDueDate ||
            feeSummary.nextMonthlyDueDate ||
            "a later date"
          }`
      )
      .join("; ");

  return `No monthly fee is due on ${billingDate}. ${details}. Select the due date as the billing date to generate that bill.`;
}

/**
 * Advance payments of a student, oldest first.
 *
 * Only the document references are returned: the amounts are re-read inside
 * the invoice transaction so an advance can never be consumed twice, and can
 * never be consumed at all if writing the invoice fails.
 */
async function findStudentAdvanceRefs(
  studentId: string
): Promise<DocumentReference[]> {
  if (!studentId) {
    return [];
  }

  const advanceQuery = query(
    collection(db, "financeIncome"),
    where("studentId", "==", studentId)
  );

  const snapshot = await getDocs(advanceQuery);

  return snapshot.docs
    .filter((docSnap) => !docSnap.data().deletedAt)
    .filter((docSnap) => docSnap.data().category === "Student Fee (Advance)")
    .sort((a, b) => {
      const aValue = a.data().incomeDate;
      const bValue = b.data().incomeDate;
      const aTime = aValue ? new Date(String(aValue)).getTime() : 0;
      const bTime = bValue ? new Date(String(bValue)).getTime() : 0;

      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return String(aValue ?? "").localeCompare(String(bValue ?? ""));
      }

      return aTime - bTime;
    })
    .map((docSnap) => docSnap.ref);
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
      data.status === "Partially Paid" ||
      data.status === "Unpaid" ||
      data.status === "Cancelled" ||
      data.status === "Sent (Mail)" ||
      data.status === "Sent (WhatsApp)"
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
  const counterRef = doc(db, "counters", COLLECTION_NAME);
  const existingCounter = await getDoc(counterRef);
  let initialNumber = 1;

  if (!existingCounter.exists()) {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    let highestNumber = 0;

    snapshot.forEach((invoiceDoc) => {
      const match = toString(invoiceDoc.data().invoiceNumber).match(
        /(?:INV[-\s]*)?(\d+)/i
      );
      const parsedNumber = match ? Number(match[1]) : 0;

      if (Number.isFinite(parsedNumber) && parsedNumber > highestNumber) {
        highestNumber = parsedNumber;
      }
    });

    initialNumber = highestNumber + 1;
  }

  return runTransaction(db, async (transaction) => {
    const counterSnapshot = await transaction.get(counterRef);
    let nextNumber = initialNumber;

    if (counterSnapshot.exists()) {
      const currentNumber = Number(counterSnapshot.data().value);
      nextNumber = Number.isFinite(currentNumber) ? currentNumber + 1 : 1;
    }

    transaction.set(counterRef, {
      value: nextNumber,
      updatedAt: serverTimestamp(),
    });

    return `INV-${String(nextNumber).padStart(3, "0")}`;
  });
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
    /**
     * Exact BS billing date the bill was calculated for. A monthly fee is only
     * invoiced when this date is the enrollment's monthly due date.
     * Defaults to `invoiceDate`.
     */
    billingDate?: string;
    months?: number;
    startMonth?: string;
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

  const invoiceDate =
    options?.invoiceDate ??
    getCurrentBSDate();

  const billingDate =
    options?.billingDate ??
    invoiceDate;

  /*
   * Attendance + monthly cycle → Fee Calculation.
   * The billing date is passed through so the invoice is built from exactly
   * the same numbers the billing screen previewed.
   */
  const feeSummary =
    await calculateStudentMonthlyFee(
      studentId,
      billingMonth,
      { billingDate, months: options?.months, startMonth: options?.startMonth }
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
      buildNothingToBillMessage(
        feeSummary,
        billingDate
      )
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

  /*
   * Freeze the attendance/monthly-cycle
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

          countedMonthly: !!line.countedMonthly,

          monthlyDueDate:
            line.monthlyDueDate,

          monthlyFeeApplied:
            !!line.monthlyFeeApplied,

          monthlyFeeAmount:
            roundMoney(
              line.monthlyFeeAmount
            ),

          sessionAmount:
            roundMoney(
              line.sessionAmount
            ),

          amount:
            roundMoney(
              line.calculatedAmount
            ),
        })
      );

  /*
   * The subtotal is re-derived from the frozen lines so the stored document is
   * internally consistent even if a line amount was rounded.
   */
  const subtotal =
    roundMoney(
      lines.reduce(
        (total, line) =>
          total +
          Math.max(
            0,
            toNumber(line.amount)
          ),
        0
      )
    );

  const discount =
    roundMoney(
      Math.min(
        Math.max(
          0,
          toNumber(
            options?.discount
          )
        ),
        subtotal
      )
    );

  const billBeforeAdvance =
    roundMoney(
      Math.max(
        subtotal -
          discount,
        0
      )
    );

  const advanceRefs =
    await findStudentAdvanceRefs(
      studentId
    );

  const invoiceRef =
    doc(
      collection(
        db,
        COLLECTION_NAME
      )
    );
  const invoiceLockRef = doc(
    db,
    "invoiceLocks",
    `${encodeURIComponent(studentId)}_${encodeURIComponent(billingMonth)}`
  );

  /*
   * Consuming the student's advance and writing the invoice happen in one
   * transaction: an advance is never spent unless the invoice it pays for was
   * created, and never spent twice by two concurrent invoices.
   */
  await runTransaction(db, async (transaction) => {
    const lockSnapshot = await transaction.get(invoiceLockRef);
    if (lockSnapshot.exists()) {
      throw new Error("An invoice already exists for this student and billing month.");
    }

    let remainingBill = billBeforeAdvance;
    let advanceApplied = 0;

    const advanceWrites: Array<{
      ref: DocumentReference;
      appliedAmount: number;
      remainingAmount: number;
    }> = [];

    for (const advanceRef of advanceRefs) {
      if (remainingBill <= 0) {
        break;
      }

      const advanceSnapshot =
        await transaction.get(advanceRef);

      if (
        !advanceSnapshot.exists() ||
        advanceSnapshot.data().deletedAt
      ) {
        continue;
      }

      const data =
        advanceSnapshot.data() as Record<string, unknown>;

      const amount = roundMoney(Math.max(0, toNumber(data.amount)));
      const applied = roundMoney(Math.max(0, toNumber(data.appliedAmount)));
      const available = roundMoney(Math.max(amount - applied, 0));

      if (available <= 0) {
        continue;
      }

      const applyNow = roundMoney(Math.min(remainingBill, available));

      if (applyNow <= 0) {
        continue;
      }

      const nextApplied = roundMoney(applied + applyNow);

      advanceWrites.push({
        ref: advanceRef,
        appliedAmount: nextApplied,
        remainingAmount: roundMoney(Math.max(amount - nextApplied, 0)),
      });

      remainingBill = roundMoney(Math.max(remainingBill - applyNow, 0));
      advanceApplied = roundMoney(advanceApplied + applyNow);
    }

    const totalAmount =
      roundMoney(
        Math.max(
          billBeforeAdvance -
            advanceApplied,
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

    const invoiceNotes = [
      options?.notes,
      feeSummary.monthlyFeeTotal > 0
        ? `Monthly fees charged: Rs. ${feeSummary.monthlyFeeTotal}`
        : "",
      feeSummary.sessionFeeTotal > 0
        ? `Session charges: Rs. ${feeSummary.sessionFeeTotal}`
        : "",
      advanceApplied > 0
        ? `Student advance applied: Rs. ${advanceApplied}`
        : "",
    ]
      .filter(Boolean)
      .join(" | ");

    for (const advanceWrite of advanceWrites) {
      transaction.update(advanceWrite.ref, {
        appliedAmount: advanceWrite.appliedAmount,
        remainingAmount: advanceWrite.remainingAmount,
        updatedAt: serverTimestamp(),
      });
    }

    transaction.set(invoiceLockRef, {
      studentId,
      billingMonth: feeSummary.month || billingMonth,
      invoiceId: invoiceRef.id,
      createdAt: serverTimestamp(),
    });

    transaction.set(invoiceRef, {
      invoiceNumber,

      studentId:
        feeSummary.studentId,

      studentName:
        feeSummary.studentName,

      studentCode:
        feeSummary.studentCode,

      billingMonth:
        feeSummary.month || billingMonth,

      invoiceDate,

      billingDate:
        feeSummary.billingDate || billingDate,

      dueDate:
        options?.dueDate ?? "",

      lines,

      subtotal,

      discount,

      monthlyFeeTotal:
        feeSummary.monthlyFeeTotal,

      sessionFeeTotal:
        feeSummary.sessionFeeTotal,

      advanceApplied,

      totalAmount,

      paidAmount,

      dueAmount,

      status,

      notes:
        invoiceNotes,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    });
  });

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

  if (snapshot.data().deletedAt) {
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

  return snapshot.docs.filter((invoiceDoc) => !invoiceDoc.data().deletedAt).map(
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
    .filter((invoiceDoc) => !invoiceDoc.data().deletedAt)
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

  return snapshot.docs.filter((invoiceDoc) => !invoiceDoc.data().deletedAt).map(
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

  if (snapshot.empty || snapshot.docs[0].data().deletedAt) {
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

  await updateFinancialRecord(
    COLLECTION_NAME,
    invoiceId,
    data as Record<string, unknown>
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