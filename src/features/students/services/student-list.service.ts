import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import type { Student } from "../types/student.types";

export async function getStudents() {
  const q = query(
    collection(db, "students"),
    orderBy("studentCode")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Student[];
}
