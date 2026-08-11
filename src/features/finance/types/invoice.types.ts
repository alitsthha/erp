export type InvoiceStatus =
  | "Draft"
  | "Issued"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export type BillingType =
  | "Monthly"
  | "Session"
  | "One-Time";

export interface InvoiceItem {
  id?: string;

  description: string;

  activityId?: string;
  activityName?: string;

  enrollmentId?: string;

  billingType: BillingType;

  quantity: number;

  unitPrice: number;

  amount: number;

  sessionCount?: number;

  attendanceCount?: number;

  notes?: string;
}

export interface Invoice {
  id?: string;

  invoiceNumber: string;

  studentId: string;
  studentName: string;
  studentCode?: string;

  invoiceDate: string;

  billingMonth: string;

  dueDate?: string;

  items: InvoiceItem[];

  subtotal: number;

  discount: number;

  adjustment: number;

  totalAmount: number;

  paidAmount: number;

  dueAmount: number;

  status: InvoiceStatus;

  notes?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InvoiceFormData {
  studentId: string;

  invoiceDate: string;

  billingMonth: string;

  dueDate?: string;

  items: InvoiceItem[];

  discount?: number;

  adjustment?: number;

  notes?: string;
}