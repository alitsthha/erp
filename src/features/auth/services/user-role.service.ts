import { initializeApp, deleteApp } from "firebase/app";
import {
  EmailAuthProvider,
  getAuth,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db, firebaseConfig, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import type { AppRole, ModulePermissions } from "@/lib/rbac";

export type UserRoleRecord = {
  email: string;
  role: AppRole;
  label?: string;
  permissions?: Partial<Record<keyof ModulePermissions, boolean>>;
  activityIds?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function createTeacherAccount({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new Error("Email and password are required.");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  const secondaryAppName = `SecondaryAuthApp-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
    await signOut(secondaryAuth);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "auth/email-already-in-use") {
      console.warn("Account already exists in Firebase Auth. Role and permissions will be updated.");
      return;
    }
    if (err.code === "auth/invalid-email") {
      throw new Error("Invalid email format.");
    }
    if (err.code === "auth/weak-password") {
      throw new Error("Password is too weak. Please enter at least 6 characters.");
    }
    throw error;
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch {
      // Ignore cleanup error
    }
  }
}

export async function verifyAdminPassword(password: string): Promise<void> {
  const currentUser = auth.currentUser;
  const email = currentUser?.email?.trim().toLowerCase();

  if (!currentUser || !email) {
    throw new Error("Your admin session has expired. Please sign in again.");
  }

  if (!password) {
    throw new Error("Admin password is required.");
  }

  try {
    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(currentUser, credential);
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      throw new Error("The admin password is incorrect.");
    }
    throw new Error("Admin password verification failed. Please sign in again and retry.");
  }
}

export async function setUserPassword(email: string, password: string): Promise<void> {
  const updatePassword = httpsCallable<{ email: string; password: string }, { success: boolean }>(
    functions,
    "setUserPassword"
  );
  await updatePassword({ email: email.trim().toLowerCase(), password });
}

export async function getUserRoleForEmail(
  email: string
): Promise<UserRoleRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  if (normalizedEmail === "admin@academy.edu") {
    return {
      email: normalizedEmail,
      role: "admin",
      label: "Admin",
      permissions: undefined,
    };
  }

  const snapshot = await getDoc(doc(db, "user_roles", normalizedEmail));

  if (!snapshot.exists()) {
    return null;
  }

  const match = snapshot.data() as Partial<UserRoleRecord>;
  const role = match.role;

  if (!role) {
    return null;
  }

  if (
    role === "admin" ||
    role === "teacher" ||
    role === "music_teacher" ||
    role === "dance_teacher" ||
    role === "art_teacher" ||
    role === "sports_teacher"
  ) {
    return {
      email: normalizedEmail,
      role,
      label: match.label ?? role,
      permissions: match.permissions ?? {},
      activityIds: Array.isArray(match.activityIds) ? match.activityIds : [],
    };
  }

  return null;
}

export async function getUserRoleForUid(uid: string): Promise<UserRoleRecord | null> {
  if (!uid) {
    return null;
  }

  return null;
}

export async function upsertUserRole({
  email,
  role,
  label,
  permissions,
  activityIds,
}: {
  email: string;
  role: AppRole;
  label?: string;
  permissions?: Partial<Record<keyof ModulePermissions, boolean>>;
  activityIds?: string[];
}): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const userRef = doc(db, "user_roles", normalizedEmail);

  await setDoc(
    userRef,
    {
      email: normalizedEmail,
      role,
      label: label ?? role,
      permissions: permissions ?? {},
      activityIds: activityIds ?? [],
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
