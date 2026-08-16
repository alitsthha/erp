export type AttendanceStatus =
  | "Present"
  | "Absent";

export type BillingStatus =
  | "Due"
  | "Paid"
  | "No Charge";

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

  sessionDate: string;
  sessionDateBS: string;

  status: AttendanceStatus;

  sessionFee?: number;

  /**
   * Finance Fields
   */

  chargeAmount?: number;

  dueAmount?: number;

  billingStatus?: BillingStatus;

  notes?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ActivityAttendanceSummary {
  activityId: string;
  activityName: string;
  activityCode: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  sessionFeeTotal: number;
  records: Attendance[];
}

export interface DailyAttendanceRecord {
  id: string;
  sessionDate: string;
  sessionDateBS: string;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  totalSessionFees: number;
  activitiesCount: number;
  attendances: Attendance[];
  activities: ActivityAttendanceSummary[];
  createdAt?: unknown;
  updatedAt?: unknown;
}