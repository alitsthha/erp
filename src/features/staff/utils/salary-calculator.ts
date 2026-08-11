export interface SalaryCalculation {
  basicSalary: number;
  allowance?: number;
  overtimeHours?: number;
  overtimeRate?: number;
  deduction?: number;
}

export function calculateSalary({
  basicSalary,
  allowance = 0,
  overtimeHours = 0,
  overtimeRate = 0,
  deduction = 0,
}: SalaryCalculation) {
  const overtimeAmount = overtimeHours * overtimeRate;

  const grossSalary =
    basicSalary +
    allowance +
    overtimeAmount;

  const netSalary =
    grossSalary - deduction;

  return {
    overtimeAmount,
    grossSalary,
    netSalary,
  };
}