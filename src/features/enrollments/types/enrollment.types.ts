export type EnrollmentStatus =
  | "Active"
  | "Inactive";

export interface Enrollment {
  id?: string;

  enrollmentCode: string;

  studentId: string;
  studentName: string;
  studentCode: string;

  activityId: string;
  activityName: string;
  activityCode: string;

  enrollmentDate: string;

  /**
   * Billing mode for this enrollment. When true, student is charged a fixed
   * monthly fee regardless of attendance. When false, student is charged per
   * attended session.
   */
  countedMonthly?: boolean;

  /**
   * Monthly fee configured for this enrollment.
   *
   * Example:
   * Music = Rs. 10,000 / month
   */
  monthlyFee?: number;

  /**
   * Expected number of sessions in a normal month.
   *
   * Example:
   * 5 sessions/month
   */
  expectedSessionsPerMonth?: number;

  /**
   * Automatically calculated or manually overridden
   * fee for one attended session.
   *
   * Example:
   * 10,000 / 5 = Rs. 2,000
   */
  sessionFee?: number;

  notes?: string;

  status: EnrollmentStatus;

  createdAt?: unknown;
  updatedAt?: unknown;
}