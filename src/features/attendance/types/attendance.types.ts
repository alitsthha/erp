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