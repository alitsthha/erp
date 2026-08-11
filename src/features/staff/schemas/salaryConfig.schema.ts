import { z } from "zod";

export const salaryConfigSchema = z.object({
  role: z.string().min(1, "Role is required"),

  salaryType: z.enum([
    "Monthly",
    "Hourly",
    "Per Class",
  ]),

  basicSalary: z.coerce
    .number()
    .min(0, "Basic salary is required"),

  allowance: z.coerce
    .number()
    .min(0),

  overtimeRate: z.coerce
    .number()
    .min(0),

  bonus: z.coerce
    .number()
    .min(0),

  deduction: z.coerce
    .number()
    .min(0),

  tax: z.coerce
    .number()
    .min(0),

  status: z.enum([
    "Active",
    "Inactive",
  ]),
});

export type SalaryConfigFormData =
  z.infer<typeof salaryConfigSchema>;