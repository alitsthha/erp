import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
} from "firebase/firestore";

import { db } from "@/firebase/config";

function extractNumericCode(activityCode: string) {
  const match = String(activityCode)
    .trim()
    .match(/(?:ACT-|AC|Act-)?(\d+)/i);

  return match ? Number(match[1]) : 0;
}

export async function generateActivityCode() {
  const counterRef = doc(db, "counters", "activities");
  const activityQuery = query(
    collection(db, "activities"),
    orderBy("activityCode", "desc"),
    limit(1)
  );

  const snapshot = await getDocs(activityQuery);
  const latestCode = snapshot.docs[0]?.data()?.activityCode as
    | string
    | undefined;
  const fallbackNumber = latestCode ? extractNumericCode(latestCode) : 0;

  const activityCode = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    const current = counterDoc.exists()
      ? counterDoc.data().lastNumber ?? fallbackNumber
      : fallbackNumber;

    const next = current + 1;

    transaction.set(counterRef, { lastNumber: next }, { merge: true });

    return `Act-${String(next).padStart(3, "0")}`;
  });

  return activityCode;
}
