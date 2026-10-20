import { financeRecordDate, matchesFinanceDate } from "./finance-date";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import type {
  FinanceDateFilter,
  FinanceSummary,
  FinanceLedgerEntry,
} from "../types/finance.types";

type AnyRecord = Record<string, unknown>;

export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function normalizePaymentMethod(value: unknown): "cash" | "bank" | "other" {
  const method = String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (method === "cash") return "cash";
  if (method.includes("bank") || method.includes("online") || method.includes("esewa") || method.includes("khalti") || method.includes("card")) return "bank";
  return "other";
}

const getDateValue = financeRecordDate;
const isDateInRange = matchesFinanceDate;

/**
 * Get income records.
 *
 * We first try the finance income collection.
 */
export async function getFinanceIncome(
  filters?: FinanceDateFilter,
): Promise<AnyRecord[]> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "financeIncome"),
        orderBy("createdAt", "desc"),
      ),
    );

    return snapshot.docs
      .map((doc): AnyRecord => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((record) => !record.deletedAt)
      .filter((record) => isDateInRange(record, filters));
  } catch (error) {
    console.error("Error loading finance income:", error);

    return [];
  }
}

/**
 * Get expense records.
 */
export async function getFinanceExpenses(
  filters?: FinanceDateFilter,
): Promise<AnyRecord[]> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "financeExpenses"),
        orderBy("createdAt", "desc"),
      ),
    );

    return snapshot.docs
      .map((doc): AnyRecord => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((record) => !record.deletedAt)
      .filter((record) => isDateInRange(record, filters));
  } catch (error) {
    console.error("Error loading finance expenses:", error);

    return [];
  }
}

/**
 * Get invoices.
 */
export async function getFinanceInvoices(
  filters?: FinanceDateFilter,
): Promise<AnyRecord[]> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "invoices"),
        orderBy("createdAt", "desc"),
      ),
    );

    return snapshot.docs
      .map((doc): AnyRecord => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((record) => !record.deletedAt)
      .filter((record) => isDateInRange(record, filters));
  } catch (error) {
    console.error("Error loading finance invoices:", error);

    return [];
  }
}

/**
 * Get payment records.
 */
export async function getFinancePayments(
  filters?: FinanceDateFilter,
): Promise<AnyRecord[]> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "financePayments"),
        orderBy("createdAt", "desc"),
      ),
    );

    return snapshot.docs
      .map((doc): AnyRecord => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((record) => !record.deletedAt)
      .filter((record) => isDateInRange(record, filters));
  } catch (error) {
    console.error("Error loading finance payments:", error);

    return [];
  }
}

/**
 * Calculate the complete Finance dashboard summary.
 */
export async function getFinanceSummary(
  filters?: FinanceDateFilter,
): Promise<FinanceSummary> {
  const [
    incomeRecords,
    expenseRecords,
    invoiceRecords,
    paymentRecords,
  ] = await Promise.all([
    getFinanceIncome(filters),
    getFinanceExpenses(filters),
    getFinanceInvoices(filters),
    getFinancePayments(filters),
  ]);

  return calculateFinanceSummary(incomeRecords, expenseRecords, invoiceRecords, paymentRecords);
}

export function outstandingDue(invoice: AnyRecord): number {
  const status = String(invoice.status ?? "").toLowerCase();
  if (invoice.deletedAt || status === "cancelled" || status === "paid") return 0;
  return Math.max(0, toNumber(invoice.dueAmount ?? Math.max(toNumber(invoice.totalAmount ?? invoice.amount) - toNumber(invoice.paidAmount), 0)));
}

export function isReceivedPayment(payment: AnyRecord): boolean {
  return !payment.deletedAt && !["cancelled", "pending"].includes(String(payment.status ?? "").toLowerCase());
}

/** Shared by the overview and its detail pages, so card totals reconcile with their records. */
export function calculateFinanceSummary(
  incomeRecords: AnyRecord[], expenseRecords: AnyRecord[], invoiceRecords: AnyRecord[], paymentRecords: AnyRecord[],
): FinanceSummary {
  const totalIncome = incomeRecords.filter((item) => !item.deletedAt).reduce((sum, item) => sum + toNumber(item.amount ?? item.totalAmount ?? item.paidAmount), 0);
  const totalExpenses = expenseRecords.filter((item) => !item.deletedAt).reduce((sum, item) => sum + toNumber(item.amount ?? item.totalAmount), 0);
  const outstandingAmount = invoiceRecords.reduce((sum, invoice) => sum + outstandingDue(invoice), 0);
  const overdueAmount = invoiceRecords.reduce((sum, invoice) => {
    const dueDate = getDateValue({ date: invoice.dueDate ?? invoice.paymentDueDate });
    return sum + (dueDate && dueDate < new Date() ? outstandingDue(invoice) : 0);
  }, 0);
  const receipts = paymentRecords.filter(isReceivedPayment);
  const balance = (method: "cash" | "bank") => receipts
    .filter((payment) => normalizePaymentMethod(payment.accountType ?? payment.paymentMethod) === method)
    .reduce((sum, payment) => sum + toNumber(payment.amount ?? payment.paidAmount), 0);
  const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  return {
    totalIncome: money(totalIncome), totalExpenses: money(totalExpenses), netProfit: money(totalIncome - totalExpenses),
    outstandingAmount: money(outstandingAmount), outstandingInvoices: invoiceRecords.filter((invoice) => outstandingDue(invoice) > 0).length,
    overdueAmount: money(overdueAmount), cashBalance: money(balance("cash")), bankBalance: money(balance("bank")),
  };
}

export function subscribeToFinanceSummary(
  filters: FinanceDateFilter | undefined,
  onChange: (summary: FinanceSummary) => void,
  onError?: (error: Error) => void,
): () => void {
  let refreshQueued = false;
  const refresh = () => {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => {
      refreshQueued = false;
      void getFinanceSummary(filters).then(onChange).catch((error: unknown) => {
        onError?.(error instanceof Error ? error : new Error("Failed to refresh finance summary."));
      });
    });
  };

  const unsubscribers = ["financeIncome", "financeExpenses", "invoices", "financePayments"].map((collectionName) =>
    onSnapshot(
      query(collection(db, collectionName), orderBy("createdAt", "desc")),
      refresh,
      (error) => onError?.(error),
    ),
  );
  refresh();
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export function subscribeToFinanceLedger(
  filters: FinanceDateFilter | undefined,
  onChange: (entries: FinanceLedgerEntry[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const sources = [
    { collectionName: "financeIncome", type: "Income" as const },
    { collectionName: "financeExpenses", type: "Expense" as const },
  ];
  const entriesBySource = new Map<string, FinanceLedgerEntry[]>();
  const unsubscribers = sources.map(({ collectionName, type }) =>
    onSnapshot(
      query(collection(db, collectionName), orderBy("createdAt", "desc")),
      (snapshot) => {
        entriesBySource.set(
          collectionName,
          snapshot.docs
            .filter((doc) => !doc.data().deletedAt)
            .map((doc) => {
              const record = doc.data() as AnyRecord;
              const date = String(
                record.incomeDate ?? record.expenseDate ?? record.createdAt ?? ""
              );
              return {
                id: doc.id,
                date,
                type,
                description: String(record.description ?? ""),
                reference: String(
                  record.referenceNumber ?? record.incomeNumber ?? record.expenseNumber ?? ""
                ),
                amount: toNumber(record.amount),
              };
            })
            .filter((entry) => isDateInRange({ incomeDate: entry.date }, filters)),
        );

        onChange(
          Array.from(entriesBySource.values())
            .flat()
            .sort((a, b) => b.date.localeCompare(a.date)),
        );
      },
      (error) => onError?.(error),
    ),
  );

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}