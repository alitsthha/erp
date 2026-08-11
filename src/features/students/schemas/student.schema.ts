import { z } from "zod";

export const studentSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name is required"),

  guardianName: z
    .string()
    .min(2, "Guardian name is required"),

  guardianPhone: z
    .string()
    .min(
      7,
      "Enter a valid contact number"
    ),

  guardianEmail: z
    .string()
    .email("Enter a valid email")
    .or(z.literal("")),

  status: z.enum([
    "Active",
    "Inactive",
  ]),

  address: z
    .string()
    .optional()
    .or(z.literal("")),

  joiningDateBS: z
    .string()
    .min(
      1,
      "Joining date is required"
    ),

  note: z
    .string()
    .optional()
    .or(z.literal("")),
});

export type StudentFormData =
  z.infer<typeof studentSchema>;