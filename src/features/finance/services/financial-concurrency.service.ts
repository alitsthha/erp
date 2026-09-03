import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

import { db } from "@/firebase/config";

export async function updateFinancialRecord(
  collectionName: string,
  recordId: string,
  data: Record<string, unknown>
): Promise<void> {
  const recordRef = doc(db, collectionName, recordId);
  let transactionAttempts = 0;

  await runTransaction(db, async (transaction) => {
    transactionAttempts += 1;
    const snapshot = await transaction.get(recordRef);

    if (!snapshot.exists()) {
      throw new Error("Record not found.");
    }

    if (transactionAttempts > 1) {
      throw new Error(
        "This record was changed by another user. Reload it before saving again."
      );
    }

    transaction.update(recordRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  });
}
