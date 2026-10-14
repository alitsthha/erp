import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Attendance } from "@/features/attendance/types/attendance.types";
import { mergeCalendarAttendance } from "@/features/calendar/calendar.utils";

/** Use the same individual records and legacy daily fallback as the calendar.
 * Planned calendar entries alone are not evidence that a class happened.
 */
export async function getBillingCalendarAttendance(first: string, last: string): Promise<Attendance[]> {
  if (first > last) return [];
  const [individual, daily] = await Promise.all(
    ["attendances", "daily_attendances"].map((name) => getDocs(query(
      collection(db, name), where("sessionDateBS", ">=", first), where("sessionDateBS", "<=", last),
    )))
  );
  const records = individual.docs
    .map((item) => ({ ...item.data(), id: item.id }) as Attendance);
  const fallback = daily.docs.filter((item) => !item.data().deletedAt).flatMap((item) => {
    const data = item.data();
    return (Array.isArray(data.attendances) ? data.attendances : [])
      .filter((record) => !record.deletedAt)
      .map((record) => ({
        ...record,
        id: record.id || `daily:${data.sessionDateBS}:${record.activityId}:${record.studentId || record.enrollmentId}`,
        sessionDateBS: record.sessionDateBS || data.sessionDateBS,
      }) as Attendance);
  });
  // Keep tombstones through the merge so an older daily summary cannot
  // resurrect a deleted individual attendance record.
  return mergeCalendarAttendance(records, fallback)
    .filter((record) => !(record as Attendance & { deletedAt?: unknown }).deletedAt);
}
