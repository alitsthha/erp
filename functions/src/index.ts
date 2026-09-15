import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

admin.initializeApp();

const db = admin.firestore();

async function isAdminRequest(request: { auth?: { token?: Record<string, unknown> } }): Promise<boolean> {
  const email = typeof request.auth?.token?.email === "string"
    ? request.auth.token.email.trim().toLowerCase()
    : "";
  const tokenAdmin = request.auth?.token?.admin === true;
  const fallbackAdmin = [
    "admin@academy.edu",
    "admin@gmail.com",
    "admin@outlook.com",
    "alitshrestha74@gmail.com",
  ].includes(email);

  if (tokenAdmin || fallbackAdmin) return true;
  if (!email) return false;

  const roleSnapshot = await db.collection("user_roles").doc(email).get();
  return roleSnapshot.data()?.role === "admin";
}

async function reverseJournalEntry(reference: string): Promise<string | null> {
  const postingRef = db.collection("accountingPostings").doc(reference);
  const postingSnapshot = await postingRef.get();
  if (!postingSnapshot.exists) return null;

  const posting = postingSnapshot.data() ?? {};
  if (posting.reversalJournalEntryId) return String(posting.reversalJournalEntryId);

  const journalRef = db.collection("journalEntries").doc(String(posting.journalEntryId ?? ""));
  const journalSnapshot = await journalRef.get();
  if (!journalSnapshot.exists) return null;

  const journal = journalSnapshot.data() ?? {};
  const lines = Array.isArray(journal.lines) ? journal.lines : [];
  const reversalRef = db.collection("journalEntries").doc();

  await db.runTransaction(async (transaction) => {
    const currentPosting = await transaction.get(postingRef);
    if (!currentPosting.exists || currentPosting.data()?.reversalJournalEntryId) return;

    const accountRefs = lines
      .map((line) => typeof line?.accountId === "string" ? db.collection("accounts").doc(line.accountId) : null)
      .filter((ref): ref is admin.firestore.DocumentReference => ref !== null);
    const accountSnapshots = await Promise.all(accountRefs.map((ref) => transaction.get(ref)));

    for (let index = 0; index < accountRefs.length; index += 1) {
      const accountSnapshot = accountSnapshots[index];
      if (!accountSnapshot.exists) continue;
      const line = lines[index] ?? {};
      const debit = Number(line.debit ?? 0);
      const credit = Number(line.credit ?? 0);
      const account = accountSnapshot.data() ?? {};
      const debitNormal = account.accountType === "Asset" || account.accountType === "Expense";
      const originalChange = debitNormal ? debit - credit : credit - debit;
      transaction.update(accountRefs[index], {
        currentBalance: Number(account.currentBalance ?? 0) - originalChange,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const reversalLines = lines.map((line) => ({
      ...line,
      debit: Number(line.credit ?? 0),
      credit: Number(line.debit ?? 0),
    }));
    transaction.set(reversalRef, {
      entryNumber: `REV-${reversalRef.id.slice(0, 8).toUpperCase()}`,
      entryDate: String(journal.entryDate ?? ""),
      description: `Reversal: ${String(journal.description ?? reference)}`,
      reference: `${reference}-REVERSAL`,
      lines: reversalLines,
      totalDebit: Number(journal.totalCredit ?? 0),
      totalCredit: Number(journal.totalDebit ?? 0),
      status: "Posted",
      reversalOf: journalRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.update(journalRef, {
      status: "Reversed",
      reversedAt: admin.firestore.FieldValue.serverTimestamp(),
      reversalJournalEntryId: reversalRef.id,
    });
    transaction.update(postingRef, {
      reversedAt: admin.firestore.FieldValue.serverTimestamp(),
      reversalJournalEntryId: reversalRef.id,
    });
  });

  return reversalRef.id;
}

export const deleteStudentCascade = onCall(async (request) => {
  const { studentId } = request.data ?? {};

  if (!(await isAdminRequest(request))) {
    throw new HttpsError("permission-denied", "Only administrators can delete students.");
  }

  if (typeof studentId !== "string" || studentId.trim() === "") {
    throw new HttpsError("invalid-argument", "studentId is required.");
  }

  const studentRef = db.collection("students").doc(studentId);
  const studentSnap = await studentRef.get();

  if (!studentSnap.exists) {
    throw new HttpsError("not-found", "Student not found.");
  }

  const BATCH_LIMIT = 450;
  let batch = db.batch();
  let operations = 0;

  const commitBatch = async () => {
    if (operations === 0) return;
    await batch.commit();
    batch = db.batch();
    operations = 0;
  };

  const queueDelete = async (ref: admin.firestore.DocumentReference) => {
    batch.delete(ref);
    operations += 1;

    if (operations >= BATCH_LIMIT) {
      await commitBatch();
    }
  };

  const deleteCollectionQuery = async (collectionName: string, field: string) => {
    const snapshot = await db.collection(collectionName).where(field, "==", studentId).get();

    for (const document of snapshot.docs) {
      await queueDelete(document.ref);
    }
  };

  await deleteCollectionQuery("enrollments", "studentId");
  await deleteCollectionQuery("attendances", "studentId");

  const invoicesSnapshot = await db.collection("invoices").where("studentId", "==", studentId).get();
  const invoiceIds = invoicesSnapshot.docs.map((document) => document.id);
  const invoiceLocksSnapshot = await db.collection("invoiceLocks").where("studentId", "==", studentId).get();
  const paymentsSnapshot = await db.collection("financePayments").where("studentId", "==", studentId).get();
  const invoicePayments = invoiceIds.length > 0
    ? await Promise.all(invoiceIds.map((invoiceId) => db.collection("financePayments").where("invoiceId", "==", invoiceId).get()))
    : [];
  const paymentDocs = [
    ...paymentsSnapshot.docs,
    ...invoicePayments.flatMap((snapshot) => snapshot.docs),
  ].filter((document, index, documents) => documents.findIndex((item) => item.id === document.id) === index);
  const paymentIds = paymentDocs.map((document) => document.id);
  const incomeByStudent = await db.collection("financeIncome").where("studentId", "==", studentId).get();
  const incomeByPayment = paymentIds.length > 0
    ? await Promise.all(paymentIds.map((paymentId) => db.collection("financeIncome").where("paymentId", "==", paymentId).get()))
    : [];
  const incomeDocs = [
    ...incomeByStudent.docs,
    ...incomeByPayment.flatMap((snapshot) => snapshot.docs),
  ].filter((document, index, documents) => documents.findIndex((item) => item.id === document.id) === index);

  const accountingSnapshot = await db.collection("accountingPostings").get();
  const accountingReferences = new Set([
    ...paymentIds,
    ...paymentDocs.map((document) => String(document.data().paymentNumber ?? "")),
    ...incomeDocs.map((document) => String(document.data().incomeNumber ?? "")),
    ...invoiceIds,
  ].filter(Boolean));
  for (const posting of accountingSnapshot.docs) {
    if (accountingReferences.has(posting.id)) {
      await reverseJournalEntry(posting.id);
      await queueDelete(posting.ref);
    }
  }

  for (const income of incomeDocs) await queueDelete(income.ref);
  for (const payment of paymentDocs) await queueDelete(payment.ref);
  for (const invoiceLock of invoiceLocksSnapshot.docs) await queueDelete(invoiceLock.ref);

  for (const invoiceDoc of invoicesSnapshot.docs) {
    const paymentsSnapshot = await invoiceDoc.ref.collection("payments").get();

    for (const paymentDoc of paymentsSnapshot.docs) {
      await queueDelete(paymentDoc.ref);
    }

    await queueDelete(invoiceDoc.ref);
  }

  await queueDelete(studentRef);
  await commitBatch();

  await db.collection("auditLogs").add({
    action: "DELETE_STUDENT_CASCADE",
    entityType: "students",
    entityId: studentId,
    deletedInvoiceCount: invoiceIds.length,
    deletedPaymentCount: paymentDocs.length,
    deletedIncomeCount: incomeDocs.length,
    reversedAccountingReferenceCount: accountingReferences.size,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});
