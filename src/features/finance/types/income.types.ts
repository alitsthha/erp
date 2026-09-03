export type IncomeCategory = "Student Fee" | "Student Fee (Advance)";

export interface Income {
  id?: string;

  incomeNumber: string;

  category: IncomeCategory;

  description: string;

  amount: number;

  incomeDate: string;

  source?: string;

  studentId?: string;
  studentName?: string;
  appliedAmount?: number;
  remainingAmount?: number;

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

  studentId?: string;
  studentName?: string;
  appliedAmount?: number;
  remainingAmount?: number;

  accountId?: string;
  accountName?: string;

  paymentMethod?: string;

  referenceNumber?: string;

  notes?: string;
}
