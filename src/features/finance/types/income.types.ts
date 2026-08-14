export type IncomeCategory = "Student Fee";

export interface Income {
  id?: string;

  incomeNumber: string;

  category: IncomeCategory;

  description: string;

  amount: number;

  incomeDate: string;

  source?: string;

  accountId?: string;
  accountName?: string;

  paymentMethod?: string;

  referenceNumber?: string;

  notes?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface IncomeFormData {
  category: IncomeCategory;

  description: string;

  amount: number;

  incomeDate: string;

  source?: string;

  accountId?: string;
  accountName?: string;

  paymentMethod?: string;

  referenceNumber?: string;

  notes?: string;
}
