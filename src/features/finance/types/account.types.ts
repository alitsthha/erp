import type { Timestamp } from "firebase/firestore";

export type AccountType =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Income"
  | "Expense";

export type AccountStatus =
  | "Active"
  | "Inactive";

export interface AccountFormData {
  accountCode: string;

  accountName: string;

  accountType: AccountType;

  parentAccountId?: string;

  parentAccountName?: string;

  openingBalance: number;

  currentBalance: number;

  isCashAccount: boolean;

  isBankAccount: boolean;

  status: AccountStatus;

  description: string;
}

export interface Account
  extends AccountFormData {
  id?: string;

  createdAt?: Timestamp;

  updatedAt?: Timestamp;
}