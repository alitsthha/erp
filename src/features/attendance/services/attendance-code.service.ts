import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  increment,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

const MODULE_NAME = "Attendance";
const CODE_PREFIX = "AT";

export async function generateAttendanceCode(): Promise<string> {
  const countersRef = doc(db, "counters", MODULE_NAME);

  try {
    // Try to get existing counter
    const counterDoc = await getDoc(countersRef);

    if (counterDoc.exists()) {
      // Increment existing counter
      await setDoc(countersRef, { count: increment(1) }, { merge: true });
      const updatedDoc = await getDoc(countersRef);
      const newCount = updatedDoc.data()?.count || 1;
      return `${CODE_PREFIX}${String(newCount).padStart(4, "0")}`;
    }
  } catch (error) {
    console.warn("Error accessing counter, using fallback logic", error);
  }

  // Fallback: query all attendances and find max code
  try {
    const attendancesRef = collection(db, "attendances");
    const q = query(
      attendancesRef,
      orderBy("attendanceCode", "desc"),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // First record
      await setDoc(countersRef, { count: 1 }, { merge: true });
      return `${CODE_PREFIX}0001`;
    }

    const lastCode = snapshot.docs[0].data().attendanceCode;
    const numPart = parseInt(lastCode.replace(CODE_PREFIX, ""), 10);
    const newCount = numPart + 1;
    await setDoc(
      countersRef,
      { count: newCount },
      { merge: true }
    );
    return `${CODE_PREFIX}${String(newCount).padStart(4, "0")}`;
  } catch (error) {
    console.error("Error generating attendance code:", error);
    throw new Error("Failed to generate attendance code");
  }
}
