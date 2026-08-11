import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

export async function generateStaffCode(): Promise<string> {
  const snapshot = await getDocs(collection(db, "staff"));

  const count = snapshot.size + 1;

  return `STF-${String(count).padStart(4, "0")}`;
}