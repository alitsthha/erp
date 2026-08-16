export interface Staff {
  id: string;
  staffCode: string;
  fullName: string;
  gender: string;
  phone: string;
  email?: string;
  address: string;
  joiningDate: string;
  employmentType: string;
  status: string;
}

export interface PaymentRecord {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  paymentType: "monthly" | "bonus" | "advance" | "other";
  paymentDate: string;
  status: "pending" | "paid" | "cancelled";
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}