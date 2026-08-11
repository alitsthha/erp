export type EnrollmentStatus = "Active" | "Inactive";

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

  sessionFee?: number;

  notes?: string;

  status: EnrollmentStatus;

  createdAt?: unknown;
  updatedAt?: unknown;
}