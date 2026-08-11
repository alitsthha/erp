export interface Department {
  id: string;
  name: string;
  description: string;
  staffCount: number;
  status: "Active" | "Inactive";
  createdAt?: unknown;
  updatedAt?: unknown;
}