import {
  collection,
  doc,
  getDocFromServer,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentReference,
  writeBatch,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "@/firebase/config";
import { groupAttendancesByActivity } from "@/features/attendance/services/attendance.service";
import type { Attendance } from "@/features/attendance/types/attendance.types";
import { assertStudentPaymentsCleared } from "./student-deletion-review.service";

function isFunctionsUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  if (!("code" in error)) return false;

  const code = String((error as { code?: unknown }).code ?? "");
  // Transport/CORS failures can surface as internal when a callable is not deployed.
  return ["functions/not-found", "functions/unavailable", "functions/internal", "functions/deadline-exceeded"].includes(code);
}

async function reversePosting(postingRef: DocumentReference): Promise<void> {
  const reversalRef = doc(collection(db, "journalEntries"));
  await runTransaction(db, async (transaction) => {
    const posting = await transaction.get(postingRef);
    if (!posting.exists() || posting.data().reversalJournalEntryId) return;
    const journalId = posting.data().journalEntryId;
    if (typeof journalId !== "string" || !journalId) {
      throw new Error("Cannot delete student: a linked accounting entry is missing its journal reference.");
    }
    const journalRef = doc(db, "journalEntries", journalId);
    const journalSnapshot = await transaction.get(journalRef);
    if (!journalSnapshot.exists()) {
      throw new Error("Cannot delete student: a linked accounting journal could not be found.");
    }
    const journal = journalSnapshot.data();
    const lines = (Array.isArray(journal.lines) ? journal.lines : []) as Array<Record<string, unknown>>;
    const changes = new Map<string, number>();
    for (const line of lines) {
      if (typeof line.accountId !== "string" || !line.accountId) {
        throw new Error("Cannot delete student: a linked accounting line has no account.");
      }
      const debit = Number(line.debit ?? 0);
      const credit = Number(line.credit ?? 0);
      if (!Number.isFinite(debit) || !Number.isFinite(credit)) throw new Error("Invalid accounting amount.");
      changes.set(line.accountId, (changes.get(line.accountId) ?? 0) + debit - credit);
    }
    const accounts = await Promise.all(Array.from(changes.keys()).map((id) => transaction.get(doc(db, "accounts", id))));
    for (const account of accounts) {
      if (!account.exists()) throw new Error("Cannot delete student: a linked account could not be found.");
      const data = account.data();
      const change = changes.get(account.id) ?? 0;
      const debitNormal = data.accountType === "Asset" || data.accountType === "Expense";
      transaction.update(account.ref, {
        currentBalance: Number(data.currentBalance ?? 0) - (debitNormal ? change : -change),
        updatedAt: serverTimestamp(),
      });
    }
    transaction.set(reversalRef, {
      entryNumber: `REV-${reversalRef.id.slice(0, 8).toUpperCase()}`,
      entryDate: String(journal.entryDate ?? ""),
      description: `Reversal: ${String(journal.description ?? postingRef.id)}`,
      reference: `${postingRef.id}-REVERSAL`,
      lines: lines.map((line) => ({ ...line, debit: Number(line.credit ?? 0), credit: Number(line.debit ?? 0) })),
      totalDebit: Number(journal.totalCredit ?? 0),
      totalCredit: Number(journal.totalDebit ?? 0),
      status: "Posted",
      reversalOf: journalRef.id,
      createdAt: serverTimestamp(),
    });
    const reversal = { reversedAt: serverTimestamp(), reversalJournalEntryId: reversalRef.id };
    transaction.update(journalRef, { ...reversal, status: "Reversed" });
    transaction.update(postingRef, reversal);
  });
}

async function removeStudentFromDailyAttendance(studentId: string): Promise<void> {
  const summaries = await getDocs(collection(db, "daily_attendances"));
  for (const summary of summaries.docs) {
    await runTransaction(db, async (transaction) => {
      const current = await transaction.get(summary.ref);
      if (!current.exists()) return;
      const data = current.data();
      const records = (Array.isArray(data.attendances) ? data.attendances : []) as Attendance[];
      const remaining = records.filter((record) => record.studentId !== studentId);
      if (remaining.length === records.length) return;
      if (remaining.length === 0) {
        transaction.delete(summary.ref);
        return;
      }
      const activities = groupAttendancesByActivity(remaining);
      transaction.update(summary.ref, {
        attendances: remaining,
        activities,
        totalRecords: remaining.length,
        presentCount: remaining.filter((record) => record.status === "Present").length,
        absentCount: remaining.filter((record) => record.status === "Absent").length,
        totalSessionFees: activities.reduce((total, activity) => total + activity.sessionFeeTotal, 0),
        activitiesCount: activities.length,
        updatedAt: serverTimestamp(),
      });
    });
  }
}

async function deleteStudentLocally(studentId: string): Promise<void> {
  const BATCH_LIMIT = 450;
  let batch = writeBatch(db);
  let operations = 0;
  const pendingDeletes: DocumentReference[] = [];

  const commitBatch = async () => {
    if (operations === 0) return;
    await batch.commit();
    batch = writeBatch(db);
    operations = 0;
  };

  const queueDelete = async (ref: DocumentReference) => {
    pendingDeletes.push(ref);
  };

  const deleteCollectionQuery = async (
    collectionName: string,
    field: string
  ) => {
    const snapshot = await getDocs(
      query(collection(db, collectionName), where(field, "==", studentId))
    );

    for (const document of snapshot.docs) {
      await queueDelete(document.ref);
    }
  };

  await deleteCollectionQuery("enrollments", "studentId");
  await deleteCollectionQuery("attendances", "studentId");

  const invoicesSnapshot = await getDocs(
    query(collection(db, "invoices"), where("studentId", "==", studentId))
  );
  const invoiceLocksSnapshot = await getDocs(
    query(collection(db, "invoiceLocks"), where("studentId", "==", studentId))
  );

  const invoiceIds = invoicesSnapshot.docs.map((invoiceDoc) => invoiceDoc.id);
  const paymentQueries = await Promise.all([
    getDocs(query(collection(db, "financePayments"), where("studentId", "==", studentId))),
    ...invoiceIds.map((invoiceId) => getDocs(query(collection(db, "financePayments"), where("invoiceId", "==", invoiceId)))),
  ]);
  const paymentDocs = paymentQueries
    .flatMap((snapshot) => snapshot.docs)
    .filter((document, index, documents) => documents.findIndex((item) => item.id === document.id) === index);

  const incomeQueries = await Promise.all([
    getDocs(query(collection(db, "financeIncome"), where("studentId", "==", studentId))),
    ...paymentDocs.map((paymentDoc) => getDocs(query(collection(db, "financeIncome"), where("paymentId", "==", paymentDoc.id)))),
  ]);
  const incomeDocs = incomeQueries
    .flatMap((snapshot) => snapshot.docs)
    .filter((document, index, documents) => documents.findIndex((item) => item.id === document.id) === index);

  const accountingPostings = await getDocs(collection(db, "accountingPostings"));
  const accountingReferences = new Set([
    ...paymentDocs.map((paymentDoc) => paymentDoc.id),
    ...paymentDocs.map((paymentDoc) => String(paymentDoc.data().paymentNumber ?? "")),
    ...incomeDocs.map((incomeDoc) => String(incomeDoc.data().incomeNumber ?? "")),
    ...invoiceIds,
  ].filter(Boolean));
  for (const posting of accountingPostings.docs) {
    if (accountingReferences.has(posting.id)) {
      await queueDelete(posting.ref);
    }
  }

  for (const incomeDoc of incomeDocs) await queueDelete(incomeDoc.ref);
  for (const paymentDoc of paymentDocs) await queueDelete(paymentDoc.ref);
  for (const invoiceLock of invoiceLocksSnapshot.docs) await queueDelete(invoiceLock.ref);

  for (const invoiceDoc of invoicesSnapshot.docs) {
    const paymentsSnapshot = await getDocs(
      collection(db, "invoices", invoiceDoc.id, "payments")
    );

    for (const paymentDoc of paymentsSnapshot.docs) {
      await queueDelete(paymentDoc.ref);
    }

    await queueDelete(invoiceDoc.ref);
  }

  await queueDelete(doc(db, "students", studentId));
  await assertStudentPaymentsCleared(studentId);
  for (const posting of accountingPostings.docs) {
    if (accountingReferences.has(posting.id)) await reversePosting(posting.ref);
  }
  // Complete dependent reads before deleting anything; remove the student last.
  for (const ref of pendingDeletes) {
    batch.delete(ref);
    operations += 1;
    if (operations >= BATCH_LIMIT) await commitBatch();
  }
  await commitBatch();
}

export async function deleteStudent(studentId: string): Promise<void> {
  if (!studentId || !studentId.trim() || studentId.includes("/")) {
    throw new Error("A valid student ID is required.");
  }
  await assertStudentPaymentsCleared(studentId);
  try {
    const callable = httpsCallable(functions, "deleteStudentCascade");
    await callable({ studentId });
  } catch (error) {
    if (isFunctionsUnavailableError(error)) {
      console.warn(
        "Cloud delete function unavailable; falling back to local cascade delete."
      );
      // A timed-out callable may already have completed. Check the server before retrying.
      const student = await getDocFromServer(doc(db, "students", studentId));
      if (student.exists()) await deleteStudentLocally(studentId);
    } else {
      throw error;
    }
  }
  await removeStudentFromDailyAttendance(studentId);
}
