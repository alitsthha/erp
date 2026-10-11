import { collection, getDocsFromServer, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import { getUnpaidInvoices, requireClearedPayments, type UnpaidInvoice } from "../../../../functions/src/shared/student-deletion";

export interface StudentDeletionReview {
  enrollments: Enrollment[];
  unpaidInvoices: UnpaidInvoice[];
  outstandingAmount: number;
}

export async function getStudentDeletionReview(studentId: string): Promise<StudentDeletionReview> {
  const [enrollments, invoices] = await Promise.all([
    getDocsFromServer(query(collection(db, "enrollments"), where("studentId", "==", studentId))),
    getDocsFromServer(query(collection(db, "invoices"), where("studentId", "==", studentId))),
  ]);
  const unpaidInvoices = getUnpaidInvoices(invoices.docs.map((invoice) => ({ id: invoice.id, data: invoice.data() })));
  return {
    enrollments: enrollments.docs.map((enrollment) => ({ ...enrollment.data(), id: enrollment.id } as Enrollment))
      .sort((left, right) => (left.activityName || "").localeCompare(right.activityName || "")),
    unpaidInvoices,
    outstandingAmount: Math.round(unpaidInvoices.reduce((sum, invoice) => sum + invoice.dueAmount, 0) * 100) / 100,
  };
}

export async function assertStudentPaymentsCleared(studentId: string): Promise<void> {
  const invoices = await getDocsFromServer(query(collection(db, "invoices"), where("studentId", "==", studentId)));
  requireClearedPayments(invoices.docs.map((invoice) => ({ id: invoice.id, data: invoice.data() })));
}
