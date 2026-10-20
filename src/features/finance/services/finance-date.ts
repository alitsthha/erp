import { convertADToBS, convertBSToAD } from "@/utils/nepali-date";
import type { FinanceDateFilter } from "../types/finance.types";

// Financial date fields use BS; legacy AD dates and Firestore timestamps also occur.
export function financeDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  const day = value.slice(0, 10);
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(day) && Number(day.slice(0, 4)) >= 2070
    ? convertBSToAD(day) : value;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T00:00:00`)
    : new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

type DatedRecord = { expenseDate?: unknown; incomeDate?: unknown; paymentDate?: unknown; invoiceDate?: unknown; transactionDate?: unknown; date?: unknown; createdAt?: unknown };

export function financeRecordDate(record: DatedRecord): Date | null {
  return financeDate(record.expenseDate || record.incomeDate || record.paymentDate || record.invoiceDate || record.transactionDate || record.date || record.createdAt);
}

export function matchesFinanceDate(record: DatedRecord, range?: FinanceDateFilter): boolean {
  if (!range?.startDate && !range?.endDate) return true;
  if (range.startDate && range.endDate && range.startDate > range.endDate) return false;
  const date = financeRecordDate(record);
  if (!date) return false;
  const adDay = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const bsDay = convertADToBS(adDay);
  return (!range.startDate || bsDay >= range.startDate) && (!range.endDate || bsDay <= range.endDate);
}
