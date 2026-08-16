import type {
  Attendance,
  DailyAttendanceRecord,
} from "@/features/attendance/types/attendance.types";
import {
  getAllAttendances,
  getAttendanceByStudentId,
  getAttendanceByActivityId,
  getAttendanceByEnrollmentId,
  getDailyAttendanceByDate,
  getAllAttendanceDatesBS,
} from "@/features/attendance/services/attendance.service";

export async function fetchAttendances(): Promise<Attendance[]> {
  return getAllAttendances();
}

export async function fetchDailyAttendance(
  sessionDateBS: string
): Promise<DailyAttendanceRecord | null> {
  return getDailyAttendanceByDate(sessionDateBS);
}

export async function fetchAttendanceDatesBS(): Promise<string[]> {
  return getAllAttendanceDatesBS();
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

