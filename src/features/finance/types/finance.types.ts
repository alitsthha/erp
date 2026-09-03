export interface FinanceSummary {
  totalIncome: number;

  totalExpenses: number;

  netProfit: number;

  outstandingAmount: number;

  outstandingInvoices: number;

  overdueAmount: number;

  cashBalance: number;

  bankBalance: number;
}

export interface FinanceDateFilter {
  startDate?: string;

  endDate?: string;

  studentId?: string;

  activityId?: string;

  status?: string;
}

export interface FinanceLedgerEntry {
  id: string;
  date: string;
  type: "Income" | "Expense";
  description: string;
  reference: string;
  amount: number;
}