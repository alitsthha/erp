import { normalizeEnrollmentDate } from "@/utils/calendar-date";
import type { Enrollment } from "../types/enrollment.types";

/** Enrollment continues across all BS months until explicitly made inactive. */
export function isEnrollmentActiveOn(enrollment: Enrollment, dateBS: string) {
  if (enrollment.status && enrollment.status !== "Active") return false;
  const start = normalizeEnrollmentDate(enrollment.enrollmentDate);
  return !dateBS || !start || start <= dateBS;
}
