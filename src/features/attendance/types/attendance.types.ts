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
  /** Resolved from activityId when read; not stored on new attendance records. */
  activityName: string;
  activityCode: string;

  sessionDate: string;
  sessionDateBS: string;

  status: AttendanceStatus;

  recordedByUserId?: string;
  recordedByName?: string;
  recordedByEmail?: string;
  recordedByRole?: string;
  recordedByStaffId?: string;
  updatedByUserId?: string;
  updatedByName?: string;
  updatedByEmail?: string;
  updatedByRole?: string;
  updatedByStaffId?: string;

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

/** Display-only grouping; original activity records retain their individual recorder. */
export type AttendanceListRow = Attendance & { activityIds?: string[]; groupedRecords?: Attendance[] };

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


export interface AttendanceHistoryEntry {
  id: string;
  action: "created" | "updated" | "saved";
  actor: { uid: string; name: string; email: string; role: string; staffId: string };
  changes: { field: string; before: string | number; after: string | number }[];
  createdAt?: unknown;
}
