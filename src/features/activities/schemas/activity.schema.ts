import { z } from "zod";

export const activitySchema = z.object({
  activityCode: z.string().optional(),

  activityName: z
    .string()
    .trim()
    .min(2, "Activity name is required"),

  category: z
    .string()
    .trim()
    .min(2, "Category is required"),

  coachName: z
    .string()
    .trim()
    .optional(),

  fee: z
    .string()
    .optional(),

  sessionFee: z
    .string()
    .optional(),

  description: z
    .string()
    .trim()
    .optional(),

  status: z.enum(["Active", "Inactive"]),
});

export type ActivityFormData =
  z.infer<typeof activitySchema>;