import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { AttendanceHistoryEntry } from "../types/attendance.types";

export async function getAttendanceHistory(id: string): Promise<AttendanceHistoryEntry[]> {
  const snapshot = await getDocs(query(collection(db, "attendances", id, "auditLogs"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as AttendanceHistoryEntry);
}
