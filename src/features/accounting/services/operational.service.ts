import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  query,
  runTransaction,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { generateCode } from "@/lib/generateCode";
import { createExpense } from "@/features/finance/services/expense.service";
import type {
  BankTransaction,
  CategoryRule,
  FinancialPeriod,
  JournalEntry,
  PayrollRun,
} from "../types/operational.types";

const journalCollection = collection(db, "journalEntries");
const categoryCollection = collection(db, "financeCategoryRules");
const periodCollection = collection(db, "financialPeriods");
const bankCollection = collection(db, "bankTransactions");
const payrollCollection = collection(db, "payrollRuns");

function mapRecord<T>(id: string, data: Record<string, unknown>): T {
  return { id, ...data } as T;
}

async function getCollection<T>(source: ReturnType<typeof collection>): Promise<T[]> {
  const snapshot = await getDocs(source);
  return snapshot.docs.map((item) => mapRecord<T>(item.id, item.data() as Record<string, unknown>));
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  return getCollection<JournalEntry>(journalCollection);
}

export async function createJournalEntry(data: Omit<JournalEntry, "id" | "entryNumber" | "createdAt">): Promise<string> {
  await assertPeriodOpen(data.entryDate);
  if (Math.abs(data.totalDebit - data.totalCredit) > 0.009) {
    throw new Error("Journal entry must balance debits and credits.");
  }
  const entryNumber = await generateCode("journalEntries", "JE");
  const reference = doc(journalCollection);
  await runTransaction(db, async (transaction) => {
    const accountRefs = data.lines.map((line) => doc(db, "accounts", line.accountId));
    const accountSnapshots = await Promise.all(accountRefs.map((accountRef) => transaction.get(accountRef)));

    for (let index = 0; index < data.lines.length; index += 1) {
      const accountSnapshot = accountSnapshots[index];
      if (!accountSnapshot.exists()) throw new Error(`Account ${data.lines[index].accountName} was not found.`);

      const account = accountSnapshot.data();
      const debit = Number(data.lines[index].debit || 0);
      const credit = Number(data.lines[index].credit || 0);
      const debitNormal = account.accountType === "Asset" || account.accountType === "Expense";
      const balanceChange = debitNormal ? debit - credit : credit - debit;
      transaction.update(accountRefs[index], {
        currentBalance: Number(account.currentBalance ?? 0) + balanceChange,
        updatedAt: serverTimestamp(),
      });
    }

    transaction.set(reference, {
      ...data,
      entryNumber,
      totalDebit: Number(data.totalDebit),
      totalCredit: Number(data.totalCredit),
      createdAt: serverTimestamp(),
    });
  });
  return reference.id;
}

export async function getCategoryRules(): Promise<CategoryRule[]> {
  return getCollection<CategoryRule>(categoryCollection);
}

export async function createCategoryRule(data: Omit<CategoryRule, "id" | "createdAt">): Promise<string> {
  const reference = await addDoc(categoryCollection, { ...data, createdAt: serverTimestamp() });
  return reference.id;
}

export async function getFinancialPeriods(): Promise<FinancialPeriod[]> {
  return getCollection<FinancialPeriod>(periodCollection);
}

export async function createFinancialPeriod(data: Omit<FinancialPeriod, "id">): Promise<string> {
  const reference = await addDoc(periodCollection, { ...data, createdAt: serverTimestamp() });
  return reference.id;
}

export async function lockFinancialPeriod(periodId: string): Promise<void> {
  if (!periodId) throw new Error("Financial period is required.");
  await updateDoc(doc(db, "financialPeriods", periodId), {
    status: "Locked",
    lockedAt: serverTimestamp(),
  });
}

export async function getBankTransactions(): Promise<BankTransaction[]> {
  return getCollection<BankTransaction>(bankCollection);
}

export async function createBankTransaction(data: Omit<BankTransaction, "id" | "reconciledAt">): Promise<string> {
  await assertPeriodOpen(data.transactionDate);
  const reference = await addDoc(bankCollection, { ...data, reconciled: false });
  return reference.id;
}

export async function reconcileBankTransaction(transactionId: string): Promise<void> {
  await updateDoc(doc(db, "bankTransactions", transactionId), {
    reconciled: true,
    reconciledAt: serverTimestamp(),
  });
}

export async function getPayrollRuns(): Promise<PayrollRun[]> {
  return getCollection<PayrollRun>(payrollCollection);
}

export async function createPayrollRun(data: Omit<PayrollRun, "id" | "createdAt">): Promise<string> {
  await assertPeriodOpen(data.paymentDate);

  const staffIds = data.payslips.map((payslip) => payslip.staffId);
  if (new Set(staffIds).size !== staffIds.length) {
    throw new Error("A payroll run cannot contain the same employee more than once.");
  }

  const existingRuns = await getDocs(
    query(payrollCollection, where("period", "==", data.period))
  );
  const existingStaffIds = new Set(
    existingRuns.docs.flatMap((run) => {
      const payslips = run.data().payslips;
      return Array.isArray(payslips)
        ? payslips.map((payslip) => (payslip as { staffId?: unknown }).staffId)
        : [];
    })
  );
  const duplicateStaffId = staffIds.find((staffId) => existingStaffIds.has(staffId));

  if (duplicateStaffId) {
    throw new Error("Payroll has already been generated for an employee in this month.");
  }

  const reservationRefs = staffIds.map((staffId) =>
    doc(db, "payrollReservations", `${data.period}_${staffId}`)
  );
  const reference = doc(payrollCollection);

  await runTransaction(db, async (transaction) => {
    for (const reservationRef of reservationRefs) {
      const reservation = await transaction.get(reservationRef);
      if (reservation.exists()) {
        throw new Error("Payroll has already been generated for an employee in this month.");
      }
    }

    for (const reservationRef of reservationRefs) {
      transaction.set(reservationRef, {
        period: data.period,
        createdAt: serverTimestamp(),
      });
    }

    transaction.set(reference, { ...data, createdAt: serverTimestamp() });
  });

  return reference.id;
}

export async function disbursePayrollRun(runId: string): Promise<void> {
  if (!runId) throw new Error("Payroll run is required.");

  const runReference = doc(db, "payrollRuns", runId);
  const runSnapshot = await getDoc(runReference);
  if (!runSnapshot.exists()) throw new Error("Payroll run not found.");

  const run = runSnapshot.data() as PayrollRun;
  if (run.status === "Disbursed") return;

  const expenseReference = `PAYROLL-${runId}`;
  const existingExpense = await getDocs(
    query(collection(db, "financeExpenses"), where("referenceNumber", "==", expenseReference))
  );
  const payrollExpenseId = existingExpense.docs[0]?.id ?? await createExpense({
    category: "Salaries",
    description: `Salary payroll for ${run.period}`,
    amount: Number(run.netAmount),
    expenseDate: run.paymentDate,
    paymentMethod: "Cash",
    referenceNumber: expenseReference,
    notes: `${run.staffCount} staff member${run.staffCount === 1 ? "" : "s"}`,
  });

  await updateDoc(runReference, {
    status: "Disbursed",
    payrollExpenseId,
    disbursedAt: serverTimestamp(),
  });
}

async function assertPeriodOpen(date: string): Promise<void> {
  const periods = await getFinancialPeriods();
  const locked = periods.some((period) => period.status === "Locked" && date >= period.startDate && date <= period.endDate);
  if (locked) throw new Error("This financial period is locked.");
}
