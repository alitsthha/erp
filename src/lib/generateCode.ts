import {
  doc,
  runTransaction,
} from "firebase/firestore";

import { db } from "@/firebase/config";

export async function generateCode(
  counterName: string,
  prefix: string
) {
  const counterRef = doc(db, "counters", counterName);

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    if (!counterDoc.exists()) {
      throw new Error(
        `Counter '${counterName}' does not exist.`
      );
    }

    const lastNumber = counterDoc.data().lastNumber || 0;

    const nextNumber = lastNumber + 1;

    transaction.update(counterRef, {
      lastNumber: nextNumber,
    });

    return `${prefix}-${nextNumber
      .toString()
      .padStart(6, "0")}`;
  });
}