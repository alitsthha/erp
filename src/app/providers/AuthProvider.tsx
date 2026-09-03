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

type AuthContextValue = {
  user: User | null;
  role: AppRole | null;
  permissions: ModulePermissions;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setPermissions(createDefaultPermissions("teacher"));
        setLoading(false);
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
    });

    return unsubscribe;
  }, []);

  const login = async (
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; role?: AppRole; error?: string }> => {
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
      return { success: true, role: nextRole };
    } catch (err: unknown) {
      setLoading(false);
      const message =
        err instanceof Error ? err.message : "Invalid email or password.";
      return {
        success: false,
        error:
          message.includes("invalid-credential") ||
          message.includes("user-not-found") ||
          message.includes("wrong-password")
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
  };

  const value = useMemo(
    () => ({
      user,
      role,
      permissions,
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
    [user, role, permissions, loading]
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