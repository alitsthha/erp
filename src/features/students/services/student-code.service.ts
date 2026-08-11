import {
  collection,
  doc,
  getDocs,
  limit,
  runTransaction,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "@/firebase/config";

function extractNumericCode(studentCode: string) {
  const match = studentCode.match(/^ST(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export async function generateStudentCode() {
  const counterRef = doc(db, "counters", "students");
  const studentsQuery = query(
    collection(db, "students"),
    orderBy("studentCode", "desc"),
    limit(1)
  );

  const snapshot = await getDocs(studentsQuery);
  const latestCode = snapshot.docs[0]?.data()?.studentCode as
    | string
    | undefined;
  const fallbackNumber = latestCode ? extractNumericCode(latestCode) : 0;

  const studentCode = await runTransaction(
    db,
    async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      const current = counterDoc.exists()
        ? counterDoc.data().lastNumber ?? fallbackNumber
        : fallbackNumber;

      const next = current + 1;

      transaction.set(
        counterRef,
        { lastNumber: next },
        { merge: true }
      );

      return `ST${String(next).padStart(4, "0")}`;
    }
  );

  return studentCode;
}