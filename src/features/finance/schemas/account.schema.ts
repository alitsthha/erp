import { z } from "zod";

export const accountSchema = z.object({
  accountCode: z
    .string()
    .trim()
    .min(1, "Account code is required"),

  accountName: z
    .string()
    .trim()
    .min(2, "Account name is required"),

  accountType: z.enum([
    "Asset",
    "Liability",
    "Equity",
    "Income",
    "Expense",
  ]),

  parentAccountId: z
    .string()
    .optional()
    .or(z.literal("")),

  parentAccountName: z
    .string()
    .optional()
    .or(z.literal("")),

  openingBalance: z
    .coerce
    .number()
    .min(0, "Opening balance cannot be negative"),

  currentBalance: z
    .coerce
    .number()
    .min(0, "Current balance cannot be negative"),

  isCashAccount: z.boolean(),

  isBankAccount: z.boolean(),

  status: z.enum([
    "Active",
    "Inactive",
  ]),

  description: z
    .string()
    .optional()
    .default(""),
});

export type AccountFormData =
  z.infer<typeof accountSchema>;