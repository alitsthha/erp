export type InvoiceStatus =
  | "Draft"
  | "Unpaid"
  | "Partially Paid"
  | "Paid"
  | "Cancelled"
  | "Sent (Mail)"
  | "Sent (WhatsApp)";

export interface InvoiceLine {
  /** Fee events reserved by this invoice, so later bills cannot charge them again. */
  billedMonths?: string[];
  attendanceIds?: string[];
  attendanceDates?: string[];
  /** Actual calendar counts frozen when generated; absent on legacy invoices. */
  takenSessions?: number;
  heldSessions?: number;
  enrollmentId?: string;

  activityId?: string;

  /** Current activity name for linked lines; stored text only for manual lines. */
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
   * Number of newly billed Present sessions in the selected period.
   */
  sessionCount: number;

  /**
   * Fee charged per attended session.
   */
  sessionFee: number;

  /**
   * True if this invoiced line was billed monthly (flat) at the time of invoice creation.
   */
  countedMonthly?: boolean;

  /**
   * BS date on which the monthly fee of this enrollment fell due for the
   * billing month, frozen at invoice creation time.
   */
  monthlyDueDate?: string;

  /**
   * True when the monthly fee was charged on this line because the billing
   * date matched `monthlyDueDate`.
   */
  monthlyFeeApplied?: boolean;

  /**
   * Monthly part of this line (`monthlyFee` when applied, otherwise 0).
   */
  monthlyFeeAmount?: number;

  /**
   * Attendance part of this line (sessions × session fee).
   */
  sessionAmount?: number;

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

  /** Attendance cutoff, independent of the issue date. */
  billingDate?: string;

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
