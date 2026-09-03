import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { generateCode } from "@/lib/generateCode";
import type { Account } from "@/features/finance/types/account.types";
import type { JournalLine } from "../types/operational.types";

const accountsCollection = collection(db, "accounts");

const DEFAULT_ACCOUNTS = [
  { id: "system-cash", code: "1000", name: "Cash", type: "Asset" as const, cash: true, bank: false },
  { id: "system-bank", code: "1010", name: "Bank", type: "Asset" as const, cash: false, bank: true },
  { id: "system-student-fee-income", code: "4000", name: "Student Fee Income", type: "Income" as const, cash: false, bank: false },
  { id: "system-general-expense", code: "5000", name: "General Expense", type: "Expense" as const, cash: false, bank: false },
  { id: "system-salary-expense", code: "5100", name: "Salary Expense", type: "Expense" as const, cash: false, bank: false },
];

async function ensureDefaultAccounts(): Promise<Account[]> {
  const snapshot = await getDocs(accountsCollection);
  const existing = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Account);
  const accounts = [...existing];

  for (const account of DEFAULT_ACCOUNTS) {
    if (accounts.some((item) => item.id === account.id || item.accountName === account.name)) continue;
    const accountRef = doc(db, "accounts", account.id);
    await setDoc(accountRef, {
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      openingBalance: 0,
      currentBalance: 0,
      isCashAccount: account.cash,
      isBankAccount: account.bank,
      status: "Active",
      description: "System-generated accounting account",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    accounts.push({ id: account.id, accountCode: account.code, accountName: account.name, accountType: account.type, openingBalance: 0, currentBalance: 0, isCashAccount: account.cash, isBankAccount: account.bank, status: "Active", description: "System-generated accounting account" });
  }

  return accounts;
}

function findAccount(accounts: Account[], predicate: (account: Account) => boolean, message: string): Account {
  const account = accounts.find((item) => item.status === "Active" && predicate(item));
  if (!account?.id) throw new Error(message);
  return account;
}

export async function postAccountingEntry({
  date,
  description,
  reference,
  debit,
  credit,
  amount,
}: {
  date: string;
  description: string;
  reference: string;
  debit: (accounts: Account[]) => Account;
  credit: (accounts: Account[]) => Account;
  amount: number;
}): Promise<string> {
  if (amount <= 0) throw new Error("Accounting amount must be greater than zero.");

  const accounts = await ensureDefaultAccounts();
  const debitAccount = debit(accounts);
  const creditAccount = credit(accounts);
  if (debitAccount.id === creditAccount.id) throw new Error("Debit and credit accounts must be different.");

  const entryRef = doc(collection(db, "journalEntries"));
  const entryNumber = await generateCode("journalEntries", "JE");
  const lines: JournalLine[] = [
    { accountId: debitAccount.id!, accountName: debitAccount.accountName, debit: amount, credit: 0 },
    { accountId: creditAccount.id!, accountName: creditAccount.accountName, debit: 0, credit: amount },
  ];

  await runTransaction(db, async (transaction) => {
    const existingEntry = await transaction.get(doc(db, "accountingPostings", reference));
    if (existingEntry.exists()) return;

    const debitRef = doc(db, "accounts", debitAccount.id!);
    const creditRef = doc(db, "accounts", creditAccount.id!);
    const [debitSnapshot, creditSnapshot] = await Promise.all([
      transaction.get(debitRef),
      transaction.get(creditRef),
    ]);
    if (!debitSnapshot.exists() || !creditSnapshot.exists()) throw new Error("Accounting account not found.");

    const debitBalance = Number(debitSnapshot.data().currentBalance ?? 0);
    const creditBalance = Number(creditSnapshot.data().currentBalance ?? 0);
    const debitIncrease = debitAccount.accountType === "Asset" || debitAccount.accountType === "Expense";
    const creditIncrease = creditAccount.accountType === "Income" || creditAccount.accountType === "Liability" || creditAccount.accountType === "Equity";

    transaction.update(debitRef, { currentBalance: debitBalance + (debitIncrease ? amount : -amount), updatedAt: serverTimestamp() });
    transaction.update(creditRef, { currentBalance: creditBalance + (creditIncrease ? amount : -amount), updatedAt: serverTimestamp() });
    transaction.set(entryRef, { entryNumber, entryDate: date, description, reference, lines, totalDebit: amount, totalCredit: amount, status: "Posted", createdAt: serverTimestamp() });
    transaction.set(doc(db, "accountingPostings", reference), { journalEntryId: entryRef.id, entryNumber, createdAt: serverTimestamp() });
  });

  return entryRef.id;
}

export const cashAccount = (accounts: Account[]) => findAccount(accounts, (account) => account.isCashAccount || account.accountName.toLowerCase() === "cash", "Cash account is required for automatic posting.");
export const bankAccount = (accounts: Account[]) => findAccount(accounts, (account) => account.isBankAccount || account.accountName.toLowerCase() === "bank", "Bank account is required for automatic posting.");
export const studentFeeIncomeAccount = (accounts: Account[]) => findAccount(accounts, (account) => account.accountType === "Income" && account.accountName.toLowerCase().includes("student"), "Student Fee Income account is required for automatic posting.");
export const generalExpenseAccount = (accounts: Account[]) => findAccount(accounts, (account) => account.accountType === "Expense" && account.accountName.toLowerCase() === "general expense", "Expense account is required for automatic posting.");
export const salaryExpenseAccount = (accounts: Account[]) => findAccount(accounts, (account) => account.accountType === "Expense" && account.accountName.toLowerCase().includes("salary"), "Salary Expense account is required for automatic posting.");
export const getAccountsForPosting = async () => ensureDefaultAccounts();
