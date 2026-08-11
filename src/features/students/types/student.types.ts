export interface Student {
  id: string;

  studentCode: string;

  fullName: string;

  guardianName: string;

  guardianPhone: string;

  guardianEmail?: string;

  address?: string;

  joiningDate?: string;

  note?: string;

  status: "Active" | "Inactive";

  createdAt?: unknown;

  updatedAt?: unknown;
}