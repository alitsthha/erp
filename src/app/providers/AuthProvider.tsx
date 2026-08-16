import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";

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
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getDemoSession(): { uid: string; email: string; role: AppRole } | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem("erp_demo_session");
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { uid?: string; email?: string; role?: AppRole };
    if (!parsed.email || !parsed.uid || !parsed.role) {
      return null;
    }

    return {
      uid: parsed.uid,
      email: parsed.email,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<ModulePermissions>(
    createDefaultPermissions("teacher")
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const demoSession = getDemoSession();

    if (demoSession) {
      setUser({
        uid: demoSession.uid,
        email: demoSession.email,
      } as User);
      setRole(demoSession.role);
      setPermissions(
        demoSession.role === "admin"
          ? createDefaultPermissions("admin")
          : normalizePermissions(createDefaultPermissions(demoSession.role))
      );
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
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

      const nextRole = profile?.role ?? null;
      const nextPermissions =
        nextRole === "admin"
          ? createDefaultPermissions("admin")
          : normalizePermissions(profile?.permissions ?? createDefaultPermissions("teacher"));

      setRole(nextRole);
      setPermissions(nextPermissions);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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