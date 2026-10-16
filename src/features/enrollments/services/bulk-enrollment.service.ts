import { addEnrollment, DuplicateEnrollmentError } from "./enrollment.service";

export type BulkEnrollmentResult = {
  studentId: string;
  activityId: string;
  status: "created" | "skipped" | "failed";
  message: string;
};

export async function bulkEnrollStudents(
  studentIds: string[],
  activityIds: string[],
  enrollmentDate: string,
  onProgress?: (completed: number) => void,
): Promise<BulkEnrollmentResult[]> {
  if (!studentIds.length || !activityIds.length || !/^\d{4}-\d{2}-\d{2}$/.test(enrollmentDate)) {
    throw new Error("Select students, activities, and a valid enrollment date.");
  }
  const results: BulkEnrollmentResult[] = [];
  // Sequential writes preserve the existing enrollment code and duplicate checks.
  for (const studentId of new Set(studentIds)) {
    for (const activityId of new Set(activityIds)) {
      try {
        await addEnrollment({ studentId, activityId, enrollmentDate, sessionFee: "", status: "Active" });
        results.push({ studentId, activityId, status: "created", message: "Enrolled" });
      } catch (error) {
        const duplicate = error instanceof DuplicateEnrollmentError;
        results.push({ studentId, activityId, status: duplicate ? "skipped" : "failed",
          message: duplicate ? "Already enrolled (active or inactive)" : error instanceof Error ? error.message : "Enrollment failed" });
      }
      onProgress?.(results.length);
    }
  }
  return results;
}
