import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/firebase/config";

export async function generateRoleCode() {
  const counterRef = doc(db, "counters", "roles");

  return runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    if (!counterDoc.exists()) {
      throw new Error("Role counter not found.");
    }

    const current = counterDoc.data().current ?? 0;
    const next = current + 1;

    transaction.update(counterRef, {
      current: next,
    });

    return `ROL-${String(next).padStart(4, "0")}`;
  });
}