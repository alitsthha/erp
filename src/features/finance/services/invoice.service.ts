import { getActivityDirectory } from "@/features/activities/services/activity-reference.service";
import { resolveActivityReferences, withoutActivityLabels } from "@/features/activities/utils/activity-reference";
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
import type { BillingSelection } from "./billing-selection.service";
import { availableAdvance, billingDateKey } from "./billing-history.service";
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
 * Explain when fees are already covered by earlier invoices.
 */
function buildNothingToBillMessage(
  feeSummary: StudentFeeSummary,
  billingDate: string
): string {
  if (feeSummary.previouslyBilledAmount > 0) {
    return `No new fees to invoice through ${billingDate}. Existing fees are already invoiced; record any outstanding payment against those invoices.`;
  }
  return `There are no new monthly fees or attended sessions to invoice through ${billingDate}.`;
}

/**
 * Advance payments of a student, oldest first.
 *
 * Only the document references are returned: the amounts are re-read inside
 * the invoice transaction so an advance can never be consumed twice, and can
 * never be consumed at all if writing the invoice fails.
 */
async function findStudentAdvanceRefs(
  studentId: string,
  cutoff: string
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
    .filter((docSnap) => availableAdvance({ ...docSnap.data(), id: docSnap.id }, studentId, cutoff) > 0)
    .sort((a, b) => billingDateKey(a.data().incomeDate).localeCompare(billingDateKey(b.data().incomeDate)))
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

    billingDate: toString(data.billingDate) || undefined,

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
     * Inclusive BS cutoff for attendance. Payments use invoiceDate. Defaults to invoiceDate.
     */
    billingDate?: string;
    months?: number;
    startMonth?: string;
    selection?: BillingSelection;
    includeFutureAttendance?: boolean;
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

  const invoiceDate = billingDateKey(options?.invoiceDate ?? getCurrentBSDate());

  const billingDate = billingDateKey(options?.billingDate ?? invoiceDate);
  if (!invoiceDate || !billingDate) throw new Error("A valid invoice date and billing date are required.");

  // All periods for a student share a generation guard. A concurrent invoice
  // changes this revision and forces a fresh calculation before reserving fees.
  const invoiceLockRef = doc(db, "invoiceLocks", `student_${encodeURIComponent(studentId)}`);
  const initialLock = await getDoc(invoiceLockRef);
  const generation = toNumber(initialLock.data()?.generation);

  /*
   * Attendance + monthly cycle → Fee Calculation.
   * The billing date is passed through so the invoice is built from exactly
   * the same numbers the billing screen previewed.
   */
  const feeSummary =
    await calculateStudentMonthlyFee(
      studentId,
      billingMonth,
      { billingDate, months: options?.months, startMonth: options?.startMonth, paymentDate: invoiceDate, selection: options?.selection, includeFutureAttendance: options?.includeFutureAttendance }
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

  const invoiceNumber =
    await generateInvoiceNumber();

  /*
   * Freeze the attendance/monthly-cycle
   * calculation into invoice lines.
   */
  const lines:
    InvoiceLine[] =
      feeSummary.lines.filter((line) => line.calculatedAmount > 0).map(
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
          billedMonths: line.billedMonths ?? [],
          attendanceIds: line.attendanceIds ?? [],
          attendanceDates: line.attendanceDates ?? [],
          takenSessions: line.takenSessions ?? line.attendedSessions,
          heldSessions: line.heldSessions ?? 0,
          advanceSessions: line.advanceSessions ?? 0,

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
      studentId, invoiceDate
    );

  const invoiceRef =
    doc(
      collection(
        db,
        COLLECTION_NAME
      )
    );


  /*
   * Consuming the student's advance and writing the invoice happen in one
   * transaction: an advance is never spent unless the invoice it pays for was
   * created, and never spent twice by two concurrent invoices.
   */
  await runTransaction(db, async (transaction) => {
    const lockSnapshot = await transaction.get(invoiceLockRef);
    if (toNumber(lockSnapshot.data()?.generation) !== generation) {
      throw new Error("Another invoice was generated for this student. Calculate the bill again to include it.");
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
      const available = availableAdvance({ ...data, id: advanceRef.id }, studentId, invoiceDate);

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

    // Advances are payments, not discounts: preserve the full invoice total.
    const totalAmount = billBeforeAdvance;
    const paidAmount = advanceApplied;

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
      generation: generation + 1,
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

      lines: lines.map(withoutActivityLabels),

      subtotal,

      discount,

      monthlyFeeTotal:
        feeSummary.monthlyFeeTotal,

      sessionFeeTotal:
        feeSummary.sessionFeeTotal,

      advanceApplied,
      advanceIncludedInPaidAmount: true,
      months: feeSummary.months,
      billingStartMonth: options?.startMonth || feeSummary.month,

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

  return (await hydrateInvoices([mapInvoice(
    snapshot.id,
    snapshot.data() as Record<
      string,
      unknown
    >
  )]))[0];
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

  return hydrateInvoices(snapshot.docs.filter((invoiceDoc) => !invoiceDoc.data().deletedAt).map(
    (invoiceDoc) =>
      mapInvoice(
        invoiceDoc.id,
        invoiceDoc.data() as Record<
          string,
          unknown
        >
      )
  ));
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

  return hydrateInvoices(snapshot.docs
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
    ));
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

  return hydrateInvoices(snapshot.docs.filter((invoiceDoc) => !invoiceDoc.data().deletedAt).map(
    (invoiceDoc) =>
      mapInvoice(
        invoiceDoc.id,
        invoiceDoc.data() as Record<
          string,
          unknown
        >
      )
  ));
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

  return (await hydrateInvoices([mapInvoice(
    invoiceDoc.id,
    invoiceDoc.data() as Record<
      string,
      unknown
    >
  )]))[0];
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
    { ...data, ...(data.lines ? { lines: data.lines.map(withoutActivityLabels) } : {}) } as Record<string, unknown>
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

async function hydrateInvoices(invoices: Invoice[]): Promise<Invoice[]> {
  if (!invoices.some((invoice) => invoice.lines.some((line) => line.activityId))) return invoices;
  const activities = await getActivityDirectory();
  return invoices.map((invoice) => ({ ...invoice, lines: resolveActivityReferences(invoice.lines, activities) }));
}
