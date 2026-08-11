import { z } from "zod";

export const departmentSchema = z.object({
  name: z
    .string()
    .min(2, "Department name is required"),

  description: z
    .string()
    .min(3, "Description is required"),

  status: z.enum([
    "Active",
    "Inactive",
  ]),
});

export type DepartmentFormData = z.infer<typeof departmentSchema>;