import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import type { Activity } from "@/features/activities/types/activity.types";
import type { Attendance } from "@/features/attendance/types/attendance.types";

export type FeeBillingType = "Monthly" | "Session";

export interface FeeCalculationResult {
  enrollmentId: string;

  enrollmentCode: string;

  studentId: string;

  studentName: string;

  studentCode: string;

  activityId: string;

  activityName: string;

  activityCode: string;

  billingType: FeeBillingType;

  monthlyFee: number;

  sessionFee: number;

  totalSessions: number;

  attendedSessions: number;

  absentSessions: number;

  calculatedAmount: number;
}

/**
 * Determine the session fee.
 *
 * Priority:
 *
 * Attendance sessionFee
 *        ↓
 * Enrollment sessionFee
 *        ↓
 * Activity sessionFee
 */
export function resolveSessionFee(
  enrollment: Enrollment,
  activity?: Activity,
  attendances: Attendance[] = []
): number {
  const attendanceFee = attendances.find(
    (attendance) =>
      attendance.sessionFee !== undefined &&
      attendance.sessionFee !== null
  )?.sessionFee;

  if (
    attendanceFee !== undefined &&
    attendanceFee !== null
  ) {
    return Number(attendanceFee) || 0;
  }

  if (
    enrollment.sessionFee !== undefined &&
    enrollment.sessionFee !== null
  ) {
    return Number(enrollment.sessionFee) || 0;
  }

  if (
    activity?.sessionFee !== undefined &&
    activity.sessionFee !== null
  ) {
    return Number(activity.sessionFee) || 0;
  }

  return 0;
}

/**
 * Calculate the fee for one enrollment.
 *
 * Only Present attendance is billable for session-based billing.
 */
export function calculateEnrollmentFee(
  enrollment: Enrollment,
  activity: Activity | undefined,
  attendances: Attendance[],
  billingType: FeeBillingType = "Session"
): FeeCalculationResult {
  const enrollmentId = enrollment.id || "";

  const enrollmentAttendances = attendances.filter(
    (attendance) =>
      attendance.enrollmentId === enrollmentId
  );

  const attendedSessions =
    enrollmentAttendances.filter(
      (attendance) =>
        attendance.status === "Present"
    ).length;

  const absentSessions =
    enrollmentAttendances.filter(
      (attendance) =>
        attendance.status === "Absent"
    ).length;

  const totalSessions =
    enrollmentAttendances.length;

  const monthlyFee =
    Number(activity?.fee) || 0;

  const sessionFee = resolveSessionFee(
    enrollment,
    activity,
    enrollmentAttendances
  );

  let calculatedAmount = 0;

  if (billingType === "Monthly") {
    calculatedAmount = monthlyFee;
  } else {
    calculatedAmount =
      attendedSessions * sessionFee;
  }

  return {
    enrollmentId,

    enrollmentCode:
      enrollment.enrollmentCode,

    studentId:
      enrollment.studentId,

    studentName:
      enrollment.studentName,

    studentCode:
      enrollment.studentCode,

    activityId:
      enrollment.activityId,

    activityName:
      enrollment.activityName,

    activityCode:
      enrollment.activityCode,

    billingType,

    monthlyFee,

    sessionFee,

    totalSessions,

    attendedSessions,

    absentSessions,

    calculatedAmount,
  };
}

/**
 * Calculate fees for multiple enrollments.
 */
export function calculateStudentFees(
  enrollments: Enrollment[],
  activities: Activity[],
  attendances: Attendance[],
  billingType: FeeBillingType = "Session"
): FeeCalculationResult[] {
  return enrollments.map((enrollment) => {
    const activity = activities.find(
      (item) =>
        item.id === enrollment.activityId
    );

    const enrollmentAttendances =
      attendances.filter(
        (attendance) =>
          attendance.enrollmentId === enrollment.id
      );

    return calculateEnrollmentFee(
      enrollment,
      activity,
      enrollmentAttendances,
      billingType
    );
  });
}

/**
 * Calculate the total amount for multiple enrollments.
 */
export function calculateStudentTotal(
  results: FeeCalculationResult[]
): number {
  return results.reduce(
    (total, item) =>
      total + item.calculatedAmount,
    0
  );
}