import { z } from "zod";

export const enrollmentSchema = z.object({
  enrollmentCode: z.string().optional(),

  studentId: z
    .string()
    .min(1, "Please select a student"),

  activityId: z
    .string()
    .min(1, "Please select an activity"),

  enrollmentDate: z
    .string()
    .min(1, "Enrollment date is required"),

  sessionFee: z
    .string()
    .optional(),

  notes: z
    .string()
    .optional(),

  status: z.enum(["Active", "Inactive"]),
});

export type EnrollmentFormData = z.infer<
  typeof enrollmentSchema
>;