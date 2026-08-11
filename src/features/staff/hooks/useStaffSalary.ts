import { useMemo } from "react";
import { calculateSalary } from "../utils/salary-calculator";

interface Props {
  basicSalary: number;
  allowance?: number;
  overtimeHours?: number;
  overtimeRate?: number;
  deduction?: number;
}

export function useStaffSalary(data: Props) {
  return useMemo(
    () => calculateSalary(data),
    [
      data.basicSalary,
      data.allowance,
      data.overtimeHours,
      data.overtimeRate,
      data.deduction,
    ]
  );
}