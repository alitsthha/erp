import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

import { auth, db } from "@/lib/firebase";
import type { AppRole, ModulePermissions } from "@/lib/rbac";

export type UserRoleRecord = {
  email: string;
  role: AppRole;
  label?: string;
  permissions?: Partial<Record<keyof ModulePermissions, boolean>>;
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

  try {
    await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "auth/email-already-in-use") {
      throw new Error("This email already has an account. Use a different email or update the existing role.");
    }
    if (err.code === "auth/invalid-email") {
      throw new Error("Invalid email format.");
    }
    throw error;
  }
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
}: {
  email: string;
  role: AppRole;
  label?: string;
  permissions?: Partial<Record<keyof ModulePermissions, boolean>>;
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
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
