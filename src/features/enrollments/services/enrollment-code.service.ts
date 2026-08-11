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

function extractNumericCode(enrollmentCode: string) {
  const match = enrollmentCode.match(/^EN(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export async function generateEnrollmentCode() {
  const counterRef = doc(db, "counters", "enrollments");
  const enrollmentQuery = query(
    collection(db, "enrollments"),
    orderBy("enrollmentCode", "desc"),
    limit(1)
  );

  const snapshot = await getDocs(enrollmentQuery);
  const latestCode = snapshot.docs[0]?.data()?.enrollmentCode as
    | string
    | undefined;
  const fallbackNumber = latestCode ? extractNumericCode(latestCode) : 0;

  return runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const current = counterDoc.exists()
      ? counterDoc.data().lastNumber ?? fallbackNumber
      : fallbackNumber;
    const next = current + 1;

    transaction.set(counterRef, { lastNumber: next }, { merge: true });

    return `EN${String(next).padStart(4, "0")}`;
  });
}
