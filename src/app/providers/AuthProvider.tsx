import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

import { auth } from "@/lib/firebase";
import {
  createDefaultPermissions,
  normalizePermissions,
  type AppRole,
  type ModulePermissions,
} from "@/lib/rbac";
import { getUserRoleForEmail } from "@/features/auth/services/user-role.service";

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_STORAGE_KEY = "erp_login_attempts";

type LoginAttempt = {
  count: number;
  lockedUntil: number;
};

function getLoginAttempt(email: string): LoginAttempt {
  if (typeof window === "undefined") return { count: 0, lockedUntil: 0 };

  try {
    const attempts = JSON.parse(
      window.localStorage.getItem(LOGIN_ATTEMPT_STORAGE_KEY) ?? "{}"
    ) as Record<string, LoginAttempt>;
    const attempt = attempts[email];
    return attempt && Number.isFinite(attempt.count) && Number.isFinite(attempt.lockedUntil)
      ? attempt
      : { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function saveLoginAttempt(email: string, attempt: LoginAttempt) {
  if (typeof window === "undefined") return;

  try {
    const attempts = JSON.parse(
      window.localStorage.getItem(LOGIN_ATTEMPT_STORAGE_KEY) ?? "{}"
    ) as Record<string, LoginAttempt>;
    attempts[email] = attempt;
    window.localStorage.setItem(LOGIN_ATTEMPT_STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    return;
  }
}

function clearLoginAttempt(email: string) {
  if (typeof window === "undefined") return;

  try {
    const attempts = JSON.parse(
      window.localStorage.getItem(LOGIN_ATTEMPT_STORAGE_KEY) ?? "{}"
    ) as Record<string, LoginAttempt>;
    delete attempts[email];
    window.localStorage.setItem(LOGIN_ATTEMPT_STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    return;
  }
}

type AuthContextValue = {
  user: User | null;
  role: AppRole | null;
  permissions: ModulePermissions;
  activityIds: string[];
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; role?: AppRole; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<ModulePermissions>(
    createDefaultPermissions("teacher")
  );
  const [loading, setLoading] = useState(true);
  const [activityIds, setActivityIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setPermissions(createDefaultPermissions("teacher"));
        setLoading(false);
        setActivityIds([]);
        return;
      }

      const email = currentUser.email?.trim().toLowerCase() ?? "";
      const fallbackAdminEmails = [
        "admin@academy.edu",
        "admin@gmail.com",
        "admin@outlook.com",
        "alitshrestha74@gmail.com",
      ];

      const profile =
        email && fallbackAdminEmails.includes(email)
          ? { role: "admin" as AppRole, permissions: createDefaultPermissions("admin"), activityIds: [] }
          : await getUserRoleForEmail(email);

      const nextRole = profile?.role ?? "teacher";
      const nextPermissions =
        nextRole === "admin"
          ? createDefaultPermissions("admin")
          : normalizePermissions(profile?.permissions ?? createDefaultPermissions(nextRole));

      setUser(currentUser);
      setRole(nextRole);
      setPermissions(nextPermissions);
      setActivityIds(profile?.activityIds ?? []);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; role?: AppRole; error?: string }> => {
    const normalizedEmail = emailInput.trim().toLowerCase();
    const now = Date.now();
    const storedAttempt = getLoginAttempt(normalizedEmail);
    const currentAttempt =
      storedAttempt.lockedUntil > 0 && storedAttempt.lockedUntil <= now
        ? { count: 0, lockedUntil: 0 }
        : storedAttempt;

    if (currentAttempt.lockedUntil > now) {
      const minutesRemaining = Math.ceil((currentAttempt.lockedUntil - now) / 60000);
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"}.`,
      };
    }

    if (currentAttempt.lockedUntil > 0) {
      clearLoginAttempt(normalizedEmail);
    }

    setLoading(true);

    // Firebase Authentication
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        emailInput,
        passwordInput
      );
      const currentUser = userCredential.user;
      const email = currentUser.email?.trim().toLowerCase() ?? "";

      const fallbackAdminEmails = [
        "admin@academy.edu",
        "admin@gmail.com",
        "admin@outlook.com",
        "alitshrestha74@gmail.com",
      ];

      const profile =
        email && fallbackAdminEmails.includes(email)
          ? { role: "admin" as AppRole, permissions: createDefaultPermissions("admin") }
          : await getUserRoleForEmail(email);

      const nextRole = profile?.role ?? "teacher";
      const nextPermissions =
        nextRole === "admin"
          ? createDefaultPermissions("admin")
          : normalizePermissions(profile?.permissions ?? createDefaultPermissions(nextRole));

      setUser(currentUser);
      setRole(nextRole);
      setPermissions(nextPermissions);
      setLoading(false);
      clearLoginAttempt(normalizedEmail);
      return { success: true, role: nextRole };
    } catch (err: unknown) {
      setLoading(false);
      const errorCode =
        typeof err === "object" && err !== null && "code" in err
          ? String(err.code)
          : "";
      const message = err instanceof Error ? err.message : "Invalid email or password.";

      if (errorCode === "auth/too-many-requests") {
        return {
          success: false,
          error: "Too many login attempts. Firebase has temporarily blocked sign-in. Try again later.",
        };
      }

      const invalidCredentials =
        errorCode === "auth/invalid-credential" ||
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/wrong-password" ||
        message.includes("invalid-credential") ||
        message.includes("user-not-found") ||
        message.includes("wrong-password");

      if (invalidCredentials) {
        const nextCount = currentAttempt.count + 1;
        saveLoginAttempt(normalizedEmail, {
          count: nextCount,
          lockedUntil: nextCount >= LOGIN_MAX_ATTEMPTS ? now + LOGIN_LOCKOUT_MS : 0,
        });
      }

      return {
        success: false,
        error:
          invalidCredentials
            ? "Invalid email or password. Check the password and retry or contact support."
            : message,
      };
    }
  };

  const logout = async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("erp_demo_session");
    }
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Sign out error:", err);
    }
    setUser(null);
    setRole(null);
    setPermissions(createDefaultPermissions("teacher"));
    setActivityIds([]);
  };

  const value = useMemo(
    () => ({
      user,
      role,
      permissions,
      activityIds,
      loading,
      isAdmin: role === "admin",
      isTeacher:
        role === "teacher" ||
        role === "music_teacher" ||
        role === "dance_teacher" ||
        role === "art_teacher" ||
        role === "sports_teacher",
      login,
      logout,
    }),
    [user, role, permissions, activityIds, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}