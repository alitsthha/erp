import { z } from "zod";

export const attendanceSchema = z.object({
  enrollmentId: z.string().min(1, "Enrollment is required"),
  sessionDate: z.string().min(1, "Session date is required"),
  status: z.enum(["Present", "Absent"]),
  sessionFee: z.number().optional(),
  notes: z.string().optional(),
});

export type AttendanceFormData = z.infer<typeof attendanceSchema>;
