export interface SalaryConfig {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  salaryType: "Monthly" | "Hourly" | "Per Class";
  basicSalary: number;
  allowance: number;
  overtimeRate: number;
  bonus: number;
  deduction: number;
  tax: number;
  status: "Active" | "Inactive";
  createdAt?: unknown;
  updatedAt?: unknown;
}