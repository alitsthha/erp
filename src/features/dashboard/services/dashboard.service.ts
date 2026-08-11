import type { Student } from "@/features/students/types/student.types";
import { getStudents } from "@/features/students/services/student-list.service";

export type DashboardStats = {
  students: Student[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const students = await getStudents();

  return {
    students,
  };
}
