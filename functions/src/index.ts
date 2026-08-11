import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

admin.initializeApp();

const db = admin.firestore();

export const deleteStudentCascade = onCall(async (request) => {
  const { studentId } = request.data ?? {};

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

  for (const invoiceDoc of invoicesSnapshot.docs) {
    const paymentsSnapshot = await invoiceDoc.ref.collection("payments").get();

    for (const paymentDoc of paymentsSnapshot.docs) {
      await queueDelete(paymentDoc.ref);
    }

    await queueDelete(invoiceDoc.ref);
  }

  await queueDelete(studentRef);
  await commitBatch();

  return { success: true };
});
