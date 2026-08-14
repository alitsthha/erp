import { z } from "zod";

export const expenseSchema = z.object({
  category: z.enum([
    "Rent",
    "Utilities",
    "Salaries",
    "Food",
    "Transport",
    "Equipment",
    "Marketing",
    "Maintenance",
    "Office Supplies",
    "Other",
  ]),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  expenseDate: z.string().min(1, "Date is required"),
  vendor: z.string().optional(),
  accountId: z.string().optional(),
  accountName: z.string().optional(),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
