export type AttendanceStatus =
  | "Present"
  | "Absent";

export interface Attendance {
  id?: string;

  attendanceCode: string;

  enrollmentId: string;
  enrollmentCode: string;

  studentId: string;
  studentName: string;
  studentCode: string;

  activityId: string;
  activityName: string;
  activityCode: string;

  /*
   * Gregorian date if your attendance
   * record stores it.
   */
  sessionDate: string;

  /*
   * Nepali BS date.
   *
   * Example:
   * 2083-04-15
   */
  sessionDateBS: string;

  status: AttendanceStatus;

  sessionFee?: number;

  notes?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
}