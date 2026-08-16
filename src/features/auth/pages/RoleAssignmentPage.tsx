import { useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";
import {
  createDefaultPermissions,
  getLandingRouteForRole,
  moduleOptions,
  roleOptions,
  type AppRole,
  type ModuleName,
  type ModulePermissions,
} from "@/lib/rbac";
import { useStaff } from "@/features/staff/hooks/useStaff";
import { upsertUserRole, createTeacherAccount } from "@/features/auth/services/user-role.service";

export default function RoleAssignmentPage() {
  const { isAdmin, user } = useAuth();
  const { staffs, loading: loadingStaff } = useStaff();
  const [search, setSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("teacher");
  const [permissions, setPermissions] = useState<ModulePermissions>(
    createDefaultPermissions("teacher")
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createAccount, setCreateAccount] = useState(false);

  const filteredStaff = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return staffs.filter((staff) => {
      if (!keyword) return true;

      return (
        staff.fullName.toLowerCase().includes(keyword) ||
        staff.email?.toLowerCase().includes(keyword) ||
        staff.employmentType.toLowerCase().includes(keyword)
      );
    });
  }, [staffs, search]);

  const selectedStaff = staffs.find((staff) => staff.id === selectedStaffId) ?? null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to={getLandingRouteForRole("teacher")} replace />;
  }

  const applyRoleTemplate = (nextRole: AppRole) => {
    setRole(nextRole);
    setPermissions(createDefaultPermissions(nextRole));
  };

  const handlePermissionToggle = (moduleName: ModuleName) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const finalEmail = createAccount ? email.trim().toLowerCase() : selectedStaff?.email;
    const finalPassword = createAccount ? password : undefined;

    if (!finalEmail) {
      setError("Email is required. Either select a staff member or provide an email to create.");
      return;
    }

    if (createAccount && !finalPassword) {
      setError("Password is required when creating a new account.");
      return;
    }

    if (createAccount && finalPassword && finalPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      // Create Firebase Auth user if needed
      if (createAccount && finalPassword) {
        await createTeacherAccount({
          email: finalEmail,
          password: finalPassword,
        });
      }

      // Assign role and permissions
      await upsertUserRole({
        email: finalEmail,
        role,
        label: role,
        permissions,
      });

      const selectedRole = roleOptions.find((item) => item.value === role);
      const displayName = selectedStaff?.fullName || finalEmail;
      setMessage(
        `Access assigned to ${displayName} (${finalEmail}) as ${selectedRole?.label ?? role}.${createAccount ? " Account created successfully." : ""}`
      );
      setSelectedStaffId("");
      setEmail("");
      setPassword("");
      setCreateAccount(false);
      setRole("teacher");
      setPermissions(createDefaultPermissions("teacher"));
    } catch (submitError) {
      console.error(submitError);
      const errMsg = submitError instanceof Error ? submitError.message : "Unable to save user access.";
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Admin Access</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Assign Staff Roles & Permissions</h1>
        <p className="mt-2 text-sm text-slate-500">
          Filter staff, select a member or create a new account, assign a role template, and choose exactly which modules they should access.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="createAccount"
              checked={createAccount}
              onChange={(e) => {
                setCreateAccount(e.target.checked);
                if (e.target.checked) {
                  setSelectedStaffId("");
                }
              }}
              className="h-4 w-4"
            />
            <label htmlFor="createAccount" className="text-sm font-medium text-slate-700">
              Create a new teacher account
            </label>
          </div>

          {!createAccount ? (
            <>
              <label className="mb-2 block text-sm font-medium text-slate-700">Filter staff</label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email or employment type"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <div className="mt-4 max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-white">
                {loadingStaff ? (
                  <div className="p-4 text-sm text-slate-500">Loading staff...</div>
                ) : filteredStaff.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">No staff found.</div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {filteredStaff.map((staff) => (
                      <button
                        type="button"
                        key={staff.id}
                        onClick={() => setSelectedStaffId(staff.id)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                          selectedStaffId === staff.id ? "bg-blue-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <p className="font-medium text-slate-900">{staff.fullName}</p>
                          <p className="text-xs text-slate-500">{staff.email ?? "No email"}</p>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <div>{staff.employmentType}</div>
                          <div>{staff.status}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Teacher Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@gmail.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-xs text-slate-500">Share this password with the teacher to log in.</p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Selected Person</label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {createAccount ? (
                <span className="text-slate-500">{email || "Enter email and password above"}</span>
              ) : selectedStaff ? (
                <div>
                  <p className="font-semibold text-slate-900">{selectedStaff.fullName}</p>
                  <p>{selectedStaff.email ?? "No email"}</p>
                  <p className="text-sm text-slate-600">{selectedStaff.employmentType}</p>
                </div>
              ) : (
                <span className="text-slate-500">Choose a staff member or create a new account</span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Role Template</label>
            <select
              value={role}
              onChange={(event) => applyRoleTemplate(event.target.value as AppRole)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-slate-700">Module Access</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {moduleOptions.map((module) => (
                <label
                  key={module.value}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <span>{module.label}</span>
                  <input
                    type="checkbox"
                    checked={permissions[module.value]}
                    onChange={() => handlePermissionToggle(module.value)}
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || (!createAccount && !selectedStaff)}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (createAccount ? "Creating account and assigning access..." : "Saving access...") : "Assign access"}
          </button>
        </form>
      </div>
    </div>
  );
}
