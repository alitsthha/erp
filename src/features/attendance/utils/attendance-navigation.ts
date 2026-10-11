import { isValidBSDate } from "@/utils/calendar-date";
import type { Attendance } from "../types/attendance.types";

export function readAttendanceFilters(params: URLSearchParams, todayBS: string) {
  const date = params.get("date") || "";
  return {
    date: isValidBSDate(date) ? date : todayBS,
    activityId: params.get("activityId") || params.get("activity") || "all",
    view: params.get("view") === "all" ? "all" as const : "daily" as const,
  };
}

export function attendanceLink(date: string, activityId: string) {
  return `/attendance?${new URLSearchParams({ date, activityId })}`;
}

export function filterActivityRecords(records: Attendance[], activityId: string) {
  return activityId === "all" ? records : records.filter((record) => record.activityId === activityId);
}
