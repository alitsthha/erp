import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import type { StaffAttendance, StaffAttendanceStatus } from "../types/staff-attendance.types";

const COLLECTION = "staffAttendance";

function calculateHours(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 0;
  const [inHour, inMinute] = checkIn.split(":").map(Number);
  const [outHour, outMinute] = checkOut.split(":").map(Number);
  const start = inHour * 60 + inMinute;
  const end = outHour * 60 + outMinute;
  return end > start ? Number(((end - start) / 60).toFixed(2)) : 0;
}

export async function saveStaffAttendance(data: Omit<StaffAttendance, "id" | "createdAt" | "updatedAt" | "hoursWorked">): Promise<string> {
  const hoursWorked = calculateHours(data.checkIn, data.checkOut);
  const existing = await getDocs(query(
    collection(db, COLLECTION),
    where("staffId", "==", data.staffId),
    where("dateBS", "==", data.dateBS)
  ));
  const payload = { ...data, hoursWorked, updatedAt: serverTimestamp() };
  if (existing.docs[0]) {
    await updateDoc(existing.docs[0].ref, payload);
    return existing.docs[0].id;
  }
  const reference = await addDoc(collection(db, COLLECTION), { ...payload, createdAt: serverTimestamp() });
  return reference.id;
}

export async function getStaffAttendanceByPeriod(period: string): Promise<StaffAttendance[]> {
  const snapshot = await getDocs(query(
    collection(db, COLLECTION),
    where("dateBS", ">=", `${period}-01`),
    where("dateBS", "<=", `${period}-99`),
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StaffAttendance));
}

export function getAttendanceHours(record: StaffAttendance): number {
  return Number(record.hoursWorked ?? calculateHours(record.checkIn, record.checkOut));
}

export function isWorkedAttendance(status: StaffAttendanceStatus): boolean {
  return status === "Present";
}
