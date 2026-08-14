export type ExpenseCategory =
  | "Rent"
  | "Utilities"
  | "Salaries"
  | "Food"
  | "Transport"
  | "Equipment"
  | "Marketing"
  | "Maintenance"
  | "Office Supplies"
  | "Other";

export interface Expense {
  id?: string;

  expenseNumber: string;

  category: ExpenseCategory;

  description: string;

  amount: number;

  expenseDate: string;

  vendor?: string;

  accountId?: string;
  accountName?: string;

  paymentMethod?: string;

  referenceNumber?: string;

  notes?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ExpenseFormData {
  category: ExpenseCategory;

  description: string;

  amount: number;

  expenseDate: string;

  vendor?: string;

  accountId?: string;
  accountName?: string;

  paymentMethod?: string;

  referenceNumber?: string;

  notes?: string;
}
