import {
  addDoc,
  collection,
  deleteDoc,
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

  return snapshot.docs.map((docSnap) => {
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

  await updateDoc(
    doc(db, "accounts", id),
    {
      ...data,
      updatedAt: serverTimestamp(),
    }
  );
}

/**
 * Delete an account
 */
export async function deleteAccount(
  id: string
): Promise<void> {
  if (!id) {
    throw new Error("Account ID is required");
  }

  await deleteDoc(
    doc(db, "accounts", id)
  );
}