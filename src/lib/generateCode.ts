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
      const nextNumber = 1;

      transaction.set(counterRef, {
        lastNumber: nextNumber,
      });

      return `${prefix}-${nextNumber
        .toString()
        .padStart(6, "0")}`;
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