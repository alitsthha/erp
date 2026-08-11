export type PaymentMethod =
  | "Cash"
  | "Bank"
  | "Card"
  | "Online"
  | "Other";

export interface Payment {
  id?: string;

  paymentNumber: string;

  invoiceId: string;

  studentId: string;
  studentName: string;
  studentCode?: string;

  paymentDate: string;

  amount: number;

  paymentMethod: PaymentMethod;

  referenceNumber?: string;

  notes?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentFormData {
  invoiceId: string;

  paymentDate: string;

  amount: number;

  paymentMethod: PaymentMethod;

  referenceNumber?: string;

  notes?: string;
}