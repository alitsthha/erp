import { z } from "zod";

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  studentId: z.string().min(1, "Student is required"),
  studentName: z.string().min(1, "Student name is required"),
  studentCode: z.string().min(1, "Student code is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["Cash", "Bank", "Online", "Card", "Other"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
