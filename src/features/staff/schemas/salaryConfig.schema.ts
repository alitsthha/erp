import { z } from "zod";

export const salaryConfigSchema = z
  .object({
    role: z.string().min(1, "Role is required"),

    salaryType: z.enum(["Monthly", "Hourly", "Per Class"]),

    basicSalary: z.coerce
      .number()
      .min(0, "Basic salary must be at least 0"),

    allowance: z.coerce
      .number()
      .min(0, "Allowance must be at least 0"),

    overtimeRate: z.coerce
      .number()
      .min(0, "Overtime rate must be at least 0"),

    bonus: z.coerce
      .number()
      .min(0, "Bonus must be at least 0"),

    deduction: z.coerce
      .number()
      .min(0, "Deduction must be at least 0"),

    tax: z.coerce
      .number()
      .min(0, "Tax must be at least 0"),

    status: z.enum(["Active", "Inactive"]),
  })
  .strict();

export type SalaryConfigFormData = z.infer<
  typeof salaryConfigSchema
>;