export interface Staff {
  id: string;
  staffCode: string;

  fullName: string;
  gender: string;
  phone: string;
  email?: string;
  address: string;

  department: string;
  role: string;

  joiningDate: string;

  employmentType: string;
  salaryType: string;

  basicSalary: number;
  allowance?: number;
  overtimeRate?: number;

  status: string;
}