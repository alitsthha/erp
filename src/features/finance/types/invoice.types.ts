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

  /**
   * Monthly fee configured for this enrollment.
   */
  monthlyFee: number;

  /**
   * Expected sessions configured for one month.
   */
  expectedSessions: number;

  /**
   * Number of Present sessions
   * during the billing month.
   */
  sessionCount: number;

  /**
   * Fee charged per attended session.
   */
  sessionFee: number;

  /**
   * Final calculated amount for this line.
   */
  amount: number;
}

export interface Invoice {
  id?: string;

  invoiceNumber: string;

  studentId: string;

  studentName: string;

  studentCode: string;

  /**
   * Billing month in BS.
   *
   * Example:
   * 2083-04
   */
  billingMonth: string;

  /**
   * Invoice creation date.
   *
   * Stored as YYYY-MM-DD.
   */
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