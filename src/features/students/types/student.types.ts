export type Gender = "Male" | "Female" | "Other";
export type StudentStatus = "Active" | "Inactive";

export interface Student {
  id: string;

  studentCode: string;

  fullName: string;

  guardianName?: string;

  guardianPhone?: string;

  guardianEmail?: string;

  parentName?: string;

  parentPhone?: string;

  parentEmail?: string;

  studentEmail?: string;

  gender?: Gender;

  dateOfBirth?: string;

  admissionDate?: string;

  address?: string;

  joiningDate?: string;

  joiningDateBS?: string;

  note?: string;

  status: StudentStatus;

  createdAt?: unknown;

  updatedAt?: unknown;
}