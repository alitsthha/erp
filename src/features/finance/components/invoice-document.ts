import type { Student } from "@/features/students/types/student.types";
import type { Invoice } from "../types/invoice.types";

export interface InvoiceOrganization {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export interface InvoiceDocumentProps {
  invoice: Invoice;
  customer: Student | null;
  organization: InvoiceOrganization;
  pan: string;
}

export const INVOICE_COLORS = {
  blue: "#1776bc",
  navy: "#103f63",
  yellow: "#fecd08",
  green: "#41b864",
  paper: "#fffdf8",
  ink: "#203747",
  muted: "#607481",
  border: "#d9e2e6",
  tint: "#eef6fc",
};

export function invoiceMoney(amount: number): string {
  return `NPR ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

interface BillingLineDisplay {
  countedMonthly?: boolean;
  billedMonths?: string[];
  monthlyFee: number;
  monthlyFeeAmount?: number;
  amount?: number;
  sessionFee: number;
  sessionCount?: number;
  attendedSessions?: number;
  takenSessions?: number;
  heldSessions?: number;
}

export function billingLineQuantity(line: BillingLineDisplay): string {
  if (line.countedMonthly) {
    const months = line.billedMonths?.length ?? (line.monthlyFee > 0
      ? Math.round((line.monthlyFeeAmount ?? line.amount ?? line.monthlyFee) / line.monthlyFee) : 1);
    return `${months} ${months === 1 ? "month" : "months"}`;
  }
  const taken = line.takenSessions ?? line.sessionCount ?? line.attendedSessions ?? 0;
  // Legacy invoices never saved actual held counts; don't present an expected
  // monthly count as if it were a historical calendar count.
  return line.heldSessions === undefined ? `${taken} sessions` : `${taken} / ${line.heldSessions}`;
}

export function billingLineDetail(line: BillingLineDisplay): string {
  if (line.countedMonthly) return line.billedMonths?.length ? `Monthly: ${line.billedMonths.join(", ")} BS` : "Monthly fee";
  const billed = line.sessionCount ?? line.attendedSessions ?? 0;
  return line.takenSessions !== undefined && billed !== line.takenSessions
    ? `Taken / held; ${billed} ${billed === 1 ? "session" : "sessions"} billed`
    : line.heldSessions === undefined ? "Billed sessions" : "Taken / held";
}

export function billingLineRate(line: BillingLineDisplay): number {
  return line.countedMonthly ? line.monthlyFee : line.sessionFee;
}

export function invoiceRecipient({ invoice, customer }: InvoiceDocumentProps) {
  return {
    name: customer?.guardianName || customer?.parentName || "Parent / Guardian",
    student: customer?.fullName || invoice.studentName,
    phone: customer?.guardianPhone || customer?.parentPhone,
    email: customer?.guardianEmail || customer?.parentEmail || customer?.studentEmail,
    address: customer?.address,
  };
}

export const INVOICE_PAYMENT_ACCOUNT = {
  name: "Shreeju khadka",
  number: "01623128616",
  qrImage: "/pays.jpeg",
};
