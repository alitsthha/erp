import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import type {
  Account,
  AccountFormData,
} from "../types/account.types";
import { recordFinancialAudit } from "./financial-audit.service";
import { updateFinancialRecord } from "./financial-concurrency.service";

const accountsCollection = collection(db, "accounts");

/**
 * Create a new account
 */
export async function createAccount(
  data: AccountFormData
): Promise<string> {
  const accountData = {
    accountCode: data.accountCode,
    accountName: data.accountName,
    accountType: data.accountType,

    parentAccountId:
      data.parentAccountId || "",

    parentAccountName:
      data.parentAccountName || "",

    openingBalance:
      Number(data.openingBalance) || 0,

    currentBalance:
      Number(data.currentBalance) || 0,

    isCashAccount:
      Boolean(data.isCashAccount),

    isBankAccount:
      Boolean(data.isBankAccount),

    status: data.status,

    description:
      data.description || "",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    accountsCollection,
    accountData
  );

  return docRef.id;
}

/**
 * Get all accounts
 */
export async function getAccounts(): Promise<Account[]> {
  const q = query(
    accountsCollection,
    orderBy("accountCode", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.filter((docSnap) => !docSnap.data().deletedAt).map((docSnap) => {
    const data = docSnap.data();

    return {
      id: docSnap.id,

      accountCode:
        data.accountCode ?? "",

      accountName:
        data.accountName ?? "",

      accountType:
        data.accountType ?? "Asset",

      parentAccountId:
        data.parentAccountId ?? "",

      parentAccountName:
        data.parentAccountName ?? "",

      openingBalance:
        Number(data.openingBalance ?? 0),

      currentBalance:
        Number(data.currentBalance ?? 0),

      isCashAccount:
        Boolean(data.isCashAccount),

      isBankAccount:
        Boolean(data.isBankAccount),

      status:
        data.status ?? "Active",

      description:
        data.description ?? "",

      createdAt:
        data.createdAt,

      updatedAt:
        data.updatedAt,
    } as Account;
  });
}

/**
 * Get one account by ID
 */
export async function getAccountById(
  id: string
): Promise<Account | null> {
  if (!id) {
    return null;
  }

  const snapshot = await getDoc(
    doc(db, "accounts", id)
  );

  if (!snapshot.exists()) {
    return null;
  }

  if (snapshot.data().deletedAt) {
    return null;
  }

  const data = snapshot.data();

  return {
    id: snapshot.id,

    accountCode:
      data.accountCode ?? "",

    accountName:
      data.accountName ?? "",

    accountType:
      data.accountType ?? "Asset",

    parentAccountId:
      data.parentAccountId ?? "",

    parentAccountName:
      data.parentAccountName ?? "",

    openingBalance:
      Number(data.openingBalance ?? 0),

    currentBalance:
      Number(data.currentBalance ?? 0),

    isCashAccount:
      Boolean(data.isCashAccount),

    isBankAccount:
      Boolean(data.isBankAccount),

    status:
      data.status ?? "Active",

    description:
      data.description ?? "",

    createdAt:
      data.createdAt,

    updatedAt:
      data.updatedAt,
  } as Account;
}

/**
 * Update an account
 */
export async function updateAccount(
  id: string,
  data: Partial<AccountFormData>
): Promise<void> {
  if (!id) {
    throw new Error("Account ID is required");
  }

  await updateFinancialRecord("accounts", id, data as Record<string, unknown>);
}

export async function deleteAccount(
  id: string
): Promise<void> {
  if (!id) {
    throw new Error("Account ID is required");
  }

  const accountRef = doc(db, "accounts", id);
  const snapshot = await getDoc(accountRef);
  if (!snapshot.exists()) throw new Error("Account not found");

  await updateDoc(accountRef, {
    deletedAt: serverTimestamp(),
    deletedBy: "financial-user",
    updatedAt: serverTimestamp(),
  });
  await recordFinancialAudit("ARCHIVE", "accounts", id, snapshot.data());
}