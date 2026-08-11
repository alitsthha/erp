import { z } from "zod";

export const staffSchema = z.object({
  staffCode: z.string().optional(),

  fullName: z
    .string()
    .min(3, "Full name is required"),

  gender: z.enum([
    "Male",
    "Female",
    "Other",
  ]),

  dateOfBirth: z.string().optional(),

  joiningDate: z
    .string()
    .min(1, "Joining date is required"),

  phone: z
    .string()
    .min(10, "Phone number is required"),

  email: z
    .string()
    .email("Invalid email")
    .or(z.literal(""))
    .optional(),

  address: z
    .string()
    .min(3, "Address is required"),

  photoUrl: z.string().optional(),

  role: z
    .string()
    .min(1, "Role is required"),

  department: z
    .string()
    .min(1, "Department is required"),

  employmentType: z.enum([
    "Full Time",
    "Part Time",
    "Contract",
    "Temporary",
    "Volunteer",
  ]),

  // <-- Updated
  salaryType: z.enum([
  "Monthly",
  "Daily",
  "Hourly",
]),

basicSalary: z.number().min(0),

allowance: z.number().min(0).optional(),

overtimeRate: z.number().min(0).optional(),

  status: z.enum([
    "Active",
    "Inactive",
    "Resigned",
  ]),
});

export type StaffFormData = z.infer<typeof staffSchema>;