import type { Activity } from "@/features/activities/types/activity.types";
import type { Attendance } from "@/features/attendance/types/attendance.types";
import type { StaffAttendance } from "@/features/staff/types/staff-attendance.types";
import { getAttendanceHours, isWorkedAttendance } from "@/features/staff/services/staff-attendance.service";
import type { SalaryConfig } from "@/features/staff/types/salaryConfig.types";

export interface AttendancePayrollSummary {
  presentDays: number;
  workingDays: number;
  hoursWorked: number;
  classesCompleted: number;
}

export function summarizeStaffAttendance(
  staffId: string,
  staffAttendance: StaffAttendance[],
  activities: Activity[],
  classAttendance: Attendance[]
): AttendancePayrollSummary {
  const records = staffAttendance.filter((item) => item.staffId === staffId);
  const presentDates = new Set(records.filter((item) => isWorkedAttendance(item.status)).map((item) => item.dateBS));
  const linkedActivities = new Set(activities.filter((item) => item.coachStaffId === staffId).map((item) => item.id));
  const completedClasses = new Set(
    classAttendance
      .filter((item) => item.status === "Present" && linkedActivities.has(item.activityId))
      .map((item) => `${item.activityId}-${item.sessionDateBS || item.sessionDate}`)
  );

  return {
    presentDays: presentDates.size,
    workingDays: new Set(records.map((item) => item.dateBS)).size,
    hoursWorked: records.filter((item) => isWorkedAttendance(item.status)).reduce((total, item) => total + getAttendanceHours(item), 0),
    classesCompleted: completedClasses.size,
  };
}

export function calculateAttendancePay(
  config: SalaryConfig,
  summary: AttendancePayrollSummary
): number {
  const allowance = Number(config.allowance ?? 0);
  const bonus = Number(config.bonus ?? 0);
  const deduction = Number(config.deduction ?? 0);
  const tax = Number(config.tax ?? 0);
  let earned = 0;

  if (config.salaryType === "Monthly") {
    earned = (Number(config.basicSalary) * summary.presentDays) / Number(config.expectedWorkingDays || 26);
  } else if (config.salaryType === "Hourly") {
    earned = summary.hoursWorked * Number(config.basicSalary);
  } else {
    earned = summary.classesCompleted * Number(config.basicSalary);
  }

  return Math.max(0, earned + allowance + bonus - deduction - tax);
}
