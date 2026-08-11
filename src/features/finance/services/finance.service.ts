import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import type {
  FinanceDateFilter,
  FinanceSummary,
} from "../types/finance.types";

type AnyRecord = Record<string, any>;

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getDateValue(record: AnyRecord): Date | null {
  const value =
    record.date ??
    record.transactionDate ??
    record.paymentDate ??
    record.expenseDate ??
    record.incomeDate ??
    record.createdAt;

  if (!value) return null;

  if (value?.toDate) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function isDateInRange(
  record: AnyRecord,
  filters?: FinanceDateFilter,
): boolean {
  if (!filters?.startDate && !filters?.endDate) {
    return true;
  }

  const date = getDateValue(record);

  if (!date) {
    return false;
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate);
    start.setHours(0, 0, 0, 0);

    if (date < start) {
      return false;
    }
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);

    if (date > end) {
      return false;
    }
  }

  return true;
}

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
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
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
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
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
        collection(db, "financeInvoices"),
        orderBy("createdAt", "desc"),
      ),
    );

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
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
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
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

  const totalIncome = incomeRecords.reduce(
    (total, record) =>
      total +
      toNumber(
        record.amount ??
          record.totalAmount ??
          record.paidAmount,
      ),
    0,
  );

  const totalExpenses = expenseRecords.reduce(
    (total, record) =>
      total +
      toNumber(
        record.amount ??
          record.totalAmount,
      ),
    0,
  );

  const totalInvoiced = invoiceRecords.reduce(
    (total, record) =>
      total +
      toNumber(
        record.totalAmount ??
          record.amount,
      ),
    0,
  );

  const totalPaid = paymentRecords.reduce(
    (total, record) =>
      total +
      toNumber(
        record.amount ??
          record.paidAmount,
      ),
    0,
  );

  /**
   * Outstanding = invoiced - paid.
   *
   * Never allow a negative outstanding amount.
   */
  const outstandingAmount = Math.max(
    totalInvoiced - totalPaid,
    0,
  );

  const outstandingInvoices = invoiceRecords.filter(
    (invoice) => {
      const total = toNumber(
        invoice.totalAmount ??
          invoice.amount,
      );

      const paid = toNumber(
        invoice.paidAmount,
      );

      const status = String(
        invoice.status ?? "",
      ).toLowerCase();

      return (
        total > paid &&
        status !== "paid"
      );
    },
  ).length;

  const overdueAmount = invoiceRecords.reduce(
    (total, invoice) => {
      const status = String(
        invoice.status ?? "",
      ).toLowerCase();

      const dueDate = getDateValue({
        date:
          invoice.dueDate ??
          invoice.paymentDueDate,
      });

      const invoiceTotal = toNumber(
        invoice.totalAmount ??
          invoice.amount,
      );

      const paid = toNumber(
        invoice.paidAmount,
      );

      if (
        status === "paid" ||
        invoiceTotal <= paid ||
        !dueDate
      ) {
        return total;
      }

      if (dueDate < new Date()) {
        return (
          total +
          Math.max(invoiceTotal - paid, 0)
        );
      }

      return total;
    },
    0,
  );

  /**
   * At this stage payments are treated as cash/bank receipts.
   *
   * If payment records contain account information,
   * we can split this accurately later.
   */
  const cashBalance = paymentRecords
    .filter(
      (payment) =>
        String(
          payment.accountType ??
            payment.paymentMethod ??
            "",
        ).toLowerCase() === "cash",
    )
    .reduce(
      (total, payment) =>
        total +
        toNumber(
          payment.amount ??
            payment.paidAmount,
        ),
      0,
    );

  const bankBalance = paymentRecords
    .filter(
      (payment) =>
        ["bank", "online", "esewa", "khalti"]
          .includes(
            String(
              payment.accountType ??
                payment.paymentMethod ??
                "",
            ).toLowerCase(),
          ),
    )
    .reduce(
      (total, payment) =>
        total +
        toNumber(
          payment.amount ??
            payment.paidAmount,
        ),
      0,
    );

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,

    outstandingAmount,
    outstandingInvoices,
    overdueAmount,

    cashBalance,
    bankBalance,
  };
}