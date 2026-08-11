export type AttendanceStatus = "Present" | "Absent";

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
  sessionDate: string; // BS date format YYYY-MM-DD
  sessionDateBS: string; // Nepali BS date YYYY-MM-DD
  status: AttendanceStatus;
  sessionFee?: number;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
