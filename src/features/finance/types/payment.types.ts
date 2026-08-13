export type PaymentMethod =
  | "Cash"
  | "Bank"
  | "Online"
  | "Card"
  | "Other";

export interface Payment {
  id?: string;

  paymentNumber: string;

  invoiceId: string;
  invoiceNumber: string;

  studentId: string;
  studentName: string;
  studentCode: string;

  amount: number;

  paymentDate: string;

  paymentMethod: PaymentMethod;

  referenceNumber?: string;

  notes?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
}