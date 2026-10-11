import { useAuth } from "@/app/providers/AuthProvider";
import { getLandingRouteForRole, hasModuleAccess } from "@/lib/rbac";
import { Navigate } from "react-router-dom";

export default function TeacherInfoPage() {
  const { role, user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !hasModuleAccess(role, "teacherInfo")) {
    return <Navigate to={getLandingRouteForRole(role)} replace />;
  }

  return (
    <div className="space-y-6">
      <div className="sm:p-5 p-4 ui-surface">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Teacher Access</p>
        <h1 className="ui-page-title mt-2">Teacher Information</h1>
        <p className="mt-2 text-slate-600">
          This section is available for staff members who have teacher profile access.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="sm:p-5 p-4 ui-surface">
          <h2 className="ui-section-title">Profile</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li><strong>Name:</strong> Teacher Profile</li>
            <li><strong>Email:</strong> {user.email ?? "Not available"}</li>
            <li><strong>Role:</strong> {role}</li>
          </ul>
        </div>

        <div className="sm:p-5 p-4 ui-surface">
          <h2 className="ui-section-title">Assigned Permissions</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "Attendance",
              "Student Access",
              "Teacher Info",
              "Role Based Access",
            ].map((label) => (
              <span key={label} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
