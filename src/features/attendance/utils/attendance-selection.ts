import type { Attendance, AttendanceListRow } from "../types/attendance.types";

/** A daily student row may represent several activity attendance records. */
export function attendanceSelectionRecords(rows: AttendanceListRow[]): Attendance[] {
  const records = new Map<string, Attendance>();
  for (const row of rows) {
    for (const record of row.groupedRecords ?? [row]) {
      if (record.id) records.set(record.id, record);
    }
  }
  return [...records.values()];
}
