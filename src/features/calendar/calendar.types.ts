import type { Attendance } from "@/features/attendance/types/attendance.types";

export type CalendarEntryType = "class" | "event" | "holiday";
export interface CalendarEntry {
  id: string;
  dateBS: string;
  dateAD: string;
  type: CalendarEntryType;
  title: string;
  activityId: string;
  activityName: string;
  activityCode: string;
  time: string;
  notes: string;
}

export interface CalendarItem extends CalendarEntry {
  automatic: boolean;
  records: Attendance[];
}
