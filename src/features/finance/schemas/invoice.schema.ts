import { z } from "zod";

export const invoiceLineSchema = z.object({
  enrollmentId: z.string().optional(),
  activityId: z.string().optional(),
  activityName: z.string().min(1, "Activity name is required"),
  activityCode: z.string().optional(),
  sessionCount: z.number().min(0, "Session count must be 0 or more"),
  sessionFee: z.number().min(0, "Session fee must be 0 or more"),
  amount: z.number().min(0, "Amount must be 0 or more"),
});

export const invoiceSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  studentName: z.string().min(1, "Student name is required"),
  studentCode: z.string().min(1, "Student code is required"),
  billingMonth: z.string().min(1, "Billing month is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1, "At least one line item is required"),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  paidAmount: z.number().min(0).default(0),
  dueAmount: z.number().min(0),
  status: z.enum(["Draft", "Unpaid", "Partially Paid", "Paid", "Cancelled"]),
  notes: z.string().optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
