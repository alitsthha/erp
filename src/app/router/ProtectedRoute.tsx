import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "@/app/providers/AuthProvider";
import { getLandingRouteForRole } from "@/lib/rbac";

export default function ProtectedRoute() {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role === "teacher" && !location.pathname.startsWith("/attendance") && location.pathname !== "/settings") {
    return <Navigate to="/attendance" replace />;
  }

  if (role === "admin" && location.pathname === "/") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!isAdmin || !role) {
    return <Navigate to={getLandingRouteForRole(role ?? "teacher")} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
