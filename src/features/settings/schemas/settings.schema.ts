import { z } from "zod";

export const settingsSchema = z.object({
  institutionName: z
    .string()
    .min(2, "Institution name must be at least 2 characters")
    .max(100, "Institution name must be less than 100 characters"),

  code: z
    .string()
    .min(1, "Organization code is required")
    .max(20, "Code must be less than 20 characters"),

  email: z.string().email("Invalid email address"),

  phone: z
    .string()
    .min(7, "Phone number must be at least 7 characters")
    .max(20, "Phone number must be less than 20 characters"),

  address: z.string().min(3, "Address is required"),

  website: z
    .string()
    .url("Invalid URL format (must start with http:// or https://)")
    .or(z.literal("")),

  taxId: z.string().optional(),

  academicYear: z.string().min(1, "Academic year is required"),

  currency: z.string().min(1, "Currency code is required"),

  timeZone: z.string().min(1, "Time zone is required"),

  maintenanceMode: z.boolean(),

  allowPublicRegistration: z.boolean(),

  enableEmailNotifications: z.boolean(),

  enableSmsNotifications: z.boolean(),

  enableAuditLogs: z.boolean(),

  defaultLanguage: z.string().min(1, "Language is required"),

  theme: z.enum(["light", "dark", "system"]),
});

export type SettingsSchemaType = z.infer<typeof settingsSchema>;
