import {
  collection,
  doc,
  getDocs,
  query,
  where,
  type DocumentReference,
  writeBatch,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "@/firebase/config";

function isFunctionsUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  if (!("code" in error)) return false;

  const code = String((error as { code?: unknown }).code ?? "");
  return code.startsWith("functions/");
}

async function deleteStudentLocally(studentId: string): Promise<void> {
  const BATCH_LIMIT = 450;
  let batch = writeBatch(db);
  let operations = 0;

  const commitBatch = async () => {
    if (operations === 0) return;
    await batch.commit();
    batch = writeBatch(db);
    operations = 0;
  };

  const queueDelete = async (ref: DocumentReference) => {
    batch.delete(ref);
    operations += 1;

    if (operations >= BATCH_LIMIT) {
      await commitBatch();
    }
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
  await commitBatch();
}

export async function deleteStudent(studentId: string): Promise<void> {
  try {
    const callable = httpsCallable(functions, "deleteStudentCascade");
    await callable({ studentId });
  } catch (error) {
    if (isFunctionsUnavailableError(error)) {
      console.warn(
        "Cloud delete function unavailable; falling back to local cascade delete."
      );
      await deleteStudentLocally(studentId);
      return;
    }

    throw error;
  }
}
