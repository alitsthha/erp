export type InvoiceStatus =
  | "Draft"
  | "Unpaid"
  | "Partially Paid"
  | "Paid"
  | "Cancelled";

export interface InvoiceLine {
  enrollmentId?: string;

  activityId?: string;
  activityName: string;
  activityCode?: string;

  sessionCount: number;

  sessionFee: number;

  amount: number;
}

export interface Invoice {
  id?: string;

  invoiceNumber: string;

  studentId: string;
  studentName: string;
  studentCode: string;

  billingMonth: string;

  invoiceDate: string;
  dueDate?: string;

  lines: InvoiceLine[];

  subtotal: number;
  discount: number;
  totalAmount: number;

  paidAmount: number;
  dueAmount: number;

  status: InvoiceStatus;

  notes?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
}