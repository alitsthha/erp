export interface FinanceSummary {
  totalIncome: number;

  totalExpenses: number;

  netProfit: number;

  outstandingAmount: number;

  cashBalance: number;

  bankBalance: number;

  invoiceCount: number;

  paidInvoiceCount: number;

  unpaidInvoiceCount: number;
}

export interface FinanceDateFilter {
  startDate?: string;

  endDate?: string;

  studentId?: string;

  activityId?: string;

  status?: string;
}