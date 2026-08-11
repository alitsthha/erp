import type { Attendance } from "@/features/attendance/types/attendance.types";
import {
  getAllAttendances,
  getAttendanceByStudentId,
  getAttendanceByActivityId,
  getAttendanceByEnrollmentId,
} from "@/features/attendance/services/attendance.service";

export async function fetchAttendances(): Promise<Attendance[]> {
  return getAllAttendances();
}

export async function fetchStudentAttendances(
  studentId: string
): Promise<Attendance[]> {
  return getAttendanceByStudentId(studentId);
}

export async function fetchActivityAttendances(
  activityId: string
): Promise<Attendance[]> {
  return getAttendanceByActivityId(activityId);
}

export async function fetchEnrollmentAttendances(
  enrollmentId: string
): Promise<Attendance[]> {
  return getAttendanceByEnrollmentId(enrollmentId);
}
