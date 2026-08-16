import { z } from "zod";

export const staffSchema = z.object({
  staffCode: z.string().optional(),
  fullName: z.string().min(3, "Full name is required"),
  gender: z.enum(["Male", "Female", "Other"]),
  joiningDate: z.string().min(1, "Joining date is required"),
  phone: z.string().min(10, "Phone number is required"),
  email: z
    .string()
    .email("Invalid email")
    .or(z.literal(""))
    .optional(),
  address: z.string().min(3, "Address is required"),
  employmentType: z.enum(["Full Time", "Part Time", "Contract", "Temporary", "Volunteer"]),
  status: z.enum(["Active", "Inactive", "Resigned"]),
  designation: z.string().optional(),
  qualification: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export type StaffFormData = z.infer<typeof staffSchema>;

export const paymentSchema = z.object({
  staffId: z.string().min(1, "Staff member is required"),
  amount: z.number().min(0, "Amount must be greater than 0"),
  paymentType: z.enum(["monthly", "bonus", "advance", "other"]),
  paymentDate: z.string().min(1, "Payment date is required"),
  status: z.enum(["pending", "paid", "cancelled"]),
  notes: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;