import { z } from "zod";

export const incomeSchema = z.object({
  category: z.enum([
    "Student Fee",
  ]),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  incomeDate: z.string().min(1, "Date is required"),
  source: z.string().optional(),
  accountId: z.string().optional(),
  accountName: z.string().optional(),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type IncomeFormValues = z.infer<typeof incomeSchema>;
