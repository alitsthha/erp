import { z } from "zod";
import { formatPersonName } from "../../../utils/person-name";

export const contactNumberSchema = z.string().trim().regex(
  /^98[0-9]{8}$/,
  "Contact number must be exactly 10 digits and start with 98"
);

export const studentSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .transform(formatPersonName),

  guardianName: z
    .string()
    .trim()
    .min(2, "Guardian name is required")
    .transform(formatPersonName),

  guardianPhone: contactNumberSchema,

  guardianEmail: z
    .string()
    .email("Enter a valid email")
    .or(z.literal("")),

  parentName: z
    .string()
    .transform(formatPersonName)
    .optional()
    .or(z.literal("")),

  parentPhone: contactNumberSchema.or(z.literal("")).optional(),

  parentEmail: z
    .string()
    .optional()
    .or(z.literal("")),

  studentEmail: z
    .string()
    .optional()
    .or(z.literal("")),

  gender: z.enum([
    "Male",
    "Female",
    "Other",
  ]).optional(),

  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal("")),

  admissionDate: z
    .string()
    .optional()
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
