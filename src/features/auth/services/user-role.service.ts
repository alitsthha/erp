import { initializeApp, deleteApp } from "firebase/app";
import {
  EmailAuthProvider,
  getAuth,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
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
}): Promise<{ created: boolean }> {
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
    return { created: true };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "auth/email-already-in-use") {
      console.warn("Account already exists in Firebase Auth. Role and permissions will be updated.");
      return { created: false };
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
    role === "multiple_activities_teacher" ||
    role === "music_teacher" ||
    role === "dance_teacher" ||
    role === "art_teacher" ||
    role === "sports_teacher"
  ) {
    const activityIds = Array.isArray(match.activityIds) ? match.activityIds : [];
    const normalizedRole: AppRole = activityIds.length > 1 ? "multiple_activities_teacher" : role;
    const permissions = { ...(match.permissions ?? {}) };
    if (activityIds.length > 0) {
      permissions.students = true;
      permissions.attendance = true;
    }

    return {
      email: normalizedEmail,
      role: normalizedRole,
      label: match.label ?? normalizedRole,
      permissions,
      activityIds,
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
  const savedPermissions = { ...(permissions ?? {}) };
  if (activityIds && activityIds.length > 0) {
    savedPermissions.students = true;
    savedPermissions.attendance = true;
  }

  await setDoc(
    userRef,
    {
      email: normalizedEmail,
      role,
      label: label ?? role,
      permissions: savedPermissions,
      activityIds: activityIds ?? [],
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function assignUserAccess({
  email,
  password,
  existingAccount = false,
  role,
  label,
  permissions,
  activityIds,
}: {
  email: string;
  password?: string;
  existingAccount?: boolean;
  role: AppRole;
  label?: string;
  permissions?: Partial<Record<keyof ModulePermissions, boolean>>;
  activityIds?: string[];
}): Promise<{ passwordResetSent: boolean }> {
  const assign = httpsCallable(functions, "assignUserAccess");
  try {
    await assign({
      email: email.trim().toLowerCase(),
      password: password ?? "",
      role,
      label: label ?? role,
      permissions: permissions ?? {},
      activityIds: activityIds ?? [],
    });
    return { passwordResetSent: false };
  } catch (error: unknown) {
    const callableError = error as { code?: string; message?: string; details?: unknown };
    const code = callableError.code?.replace("functions/", "");
    const message = callableError.message?.trim();
    if (code === "permission-denied") {
      throw new Error("Your admin session is not authorized. Sign out and sign in again.");
    }
    if (code === "failed-precondition" || code === "unavailable" || code === "internal" || code === "not-found") {
      await upsertUserRole({
        email,
        role,
        label,
        permissions,
        activityIds,
      });

      if (existingAccount && password) {
        try {
          await sendPasswordResetEmail(auth, email.trim().toLowerCase());
          return { passwordResetSent: true };
        } catch (resetError: unknown) {
          const resetCode = typeof resetError === "object" && resetError !== null && "code" in resetError
            ? String(resetError.code)
            : "";
          if (resetCode !== "auth/user-not-found") {
            throw resetError;
          }
        }
      }

      if (password) {
        const accountResult = await createTeacherAccount({ email, password });
        if (!accountResult.created) {
          await sendPasswordResetEmail(auth, email.trim().toLowerCase());
          return { passwordResetSent: true };
        }
      }

      return { passwordResetSent: false };
    }
    throw new Error(message || "Unable to assign user access. Check the Firebase Functions deployment and logs.");
  }
}
