import type { Timestamp } from "firebase/firestore";

export interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id?: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  reference?: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  status: "Posted" | "Draft";
  createdAt?: Timestamp;
}

export interface CategoryRule {
  id?: string;
  name: string;
  type: "Income" | "Expense";
  defaultAccountId: string;
  defaultAccountName: string;
  taxRate: number;
  active: boolean;
  createdAt?: Timestamp;
}

export interface FinancialPeriod {
  id?: string;
  period: string;
  startDate: string;
  endDate: string;
  status: "Open" | "Locked";
  lockedAt?: Timestamp;
}

export interface BankTransaction {
  id?: string;
  bankAccountId: string;
  bankAccountName: string;
  transactionDate: string;
  description: string;
  reference?: string;
  amount: number;
  type: "Deposit" | "Withdrawal";
  reconciled: boolean;
  reconciledAt?: Timestamp;
}

export interface PayrollRun {
  id?: string;
  period: string;
  paymentDate: string;
  staffCount: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: "Draft" | "Disbursed";
  payslips: Payslip[];
  createdAt?: Timestamp;
}

export interface Payslip {
  staffId: string;
  staffName: string;
  staffCode: string;
  period: string;
  basicSalary: number;
  allowance: number;
  deduction: number;
  tax: number;
  netPay: number;
}
