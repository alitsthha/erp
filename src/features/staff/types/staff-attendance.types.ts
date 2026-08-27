import type { Timestamp } from "firebase/firestore";

export type StaffAttendanceStatus = "Present" | "Absent" | "Leave";

export interface StaffAttendance {
  id?: string;
  staffId: string;
  staffName: string;
  dateBS: string;
  status: StaffAttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
