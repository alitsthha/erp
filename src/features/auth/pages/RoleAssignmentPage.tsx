import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import {
  UserCog,
  KeyRound,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Search,
  X,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";

import { useAuth } from "@/app/providers/AuthProvider";
import {
  createDefaultPermissions,
  getLandingRouteForRole,
  moduleOptions,
  roleOptions,
  normalizePermissions,
  type AppRole,
  type ModuleName,
  type ModulePermissions,
} from "@/lib/rbac";
import { useStaff } from "@/features/staff/hooks/useStaff";
import {
  upsertUserRole,
  createTeacherAccount,
  getUserRoleForEmail,
  type UserRoleRecord,
} from "@/features/auth/services/user-role.service";

export default function RoleAssignmentPage() {
  const { isAdmin, user } = useAuth();
  const { staffs, loading: loadingStaff } = useStaff();

  // Selection mode: 'existing' or 'custom'
  const [selectionMode, setSelectionMode] = useState<"existing" | "custom">("existing");
  const [search, setSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [staffEmailOverride, setStaffEmailOverride] = useState("");

  // Role & Permissions
  const [role, setRole] = useState<AppRole>("teacher");
  const [permissions, setPermissions] = useState<ModulePermissions>(
    createDefaultPermissions("teacher")
  );

  // Existing user role state
  const [existingUserRole, setExistingUserRole] = useState<UserRoleRecord | null>(null);
  const [loadingExistingRole, setLoadingExistingRole] = useState(false);

  // Modal & Password State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const selectedStaff = useMemo(
    () => staffs.find((staff) => staff.id === selectedStaffId) ?? null,
    [staffs, selectedStaffId]
  );

  // Determine active target email and target name
  const targetEmail = useMemo(() => {
    if (selectionMode === "existing") {
      return (selectedStaff?.email || staffEmailOverride).trim().toLowerCase();
    }
    return customEmail.trim().toLowerCase();
  }, [selectionMode, selectedStaff, staffEmailOverride, customEmail]);

  const targetName = useMemo(() => {
    if (selectionMode === "existing") {
      return selectedStaff?.fullName || "Staff Member";
    }
    return customName.trim() || targetEmail || "New User";
  }, [selectionMode, selectedStaff, customName, targetEmail]);

  const filteredStaff = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return staffs.filter((staff) => {
      if (!keyword) return true;

      return (
        staff.fullName.toLowerCase().includes(keyword) ||
        staff.email?.toLowerCase().includes(keyword) ||
        staff.employmentType.toLowerCase().includes(keyword) ||
        staff.designation?.toLowerCase().includes(keyword)
      );
    });
  }, [staffs, search]);

  // Load existing role configuration when target email changes
  useEffect(() => {
    let active = true;
    if (!targetEmail) {
      setExistingUserRole(null);
      setRole("teacher");
      setPermissions(createDefaultPermissions("teacher"));
      return;
    }

    async function loadRole() {
      setLoadingExistingRole(true);
      try {
        const record = await getUserRoleForEmail(targetEmail);
        if (active) {
          if (record) {
            setExistingUserRole(record);
            setRole(record.role);
            setPermissions(normalizePermissions(record.permissions, record.role));
          } else {
            setExistingUserRole(null);
            setRole("teacher");
            setPermissions(createDefaultPermissions("teacher"));
          }
        }
      } catch (err) {
        console.error("Error fetching existing user role:", err);
      } finally {
        if (active) {
          setLoadingExistingRole(false);
        }
      }
    }

    void loadRole();

    return () => {
      active = false;
    };
  }, [targetEmail]);

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

  const resetToCurrentlySet = () => {
    if (existingUserRole) {
      setRole(existingUserRole.role);
      setPermissions(normalizePermissions(existingUserRole.permissions, existingUserRole.role));
    }
  };

  // Open password modal after basic validation
  const handleOpenPasswordModal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setModalError(null);

    if (!targetEmail) {
      setError("Please select a staff member or enter a valid email address.");
      return;
    }

    if (existingUserRole) {
      void handleUpdateExistingRole();
      return;
    }

    setIsPasswordModalOpen(true);
  };

  const handleUpdateExistingRole = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await upsertUserRole({
        email: targetEmail,
        role,
        label: role,
        permissions,
      });

      setExistingUserRole({
        email: targetEmail,
        role,
        label: role,
        permissions,
      });
      setMessage(`Module access updated for ${targetName}. Their existing Gmail and password were kept unchanged.`);
    } catch (updateError) {
      console.error("Error updating user permissions:", updateError);
      setError(updateError instanceof Error ? updateError.message : "Unable to update user permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm password and create account + role assignment
  const handleConfirmRoleAssignment = async () => {
    setModalError(null);

    if (!password) {
      setModalError("Password is required to set authentication credentials.");
      return;
    }

    if (password.length < 6) {
      setModalError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create Firebase Auth credentials using secondary app
      await createTeacherAccount({
        email: targetEmail,
        password,
      });

      // 2. Save user role and module permissions in Firestore (user_roles collection)
      await upsertUserRole({
        email: targetEmail,
        role,
        label: role,
        permissions,
      });

      const selectedRoleObj = roleOptions.find((item) => item.value === role);
      setMessage(
        `Success! Credentials configured & access assigned to ${targetName} (${targetEmail}) as ${selectedRoleObj?.label ?? role}.`
      );

      // Refresh existing role record state
      setExistingUserRole({
        email: targetEmail,
        role,
        label: role,
        permissions,
      });

      // Reset modal state
      setIsPasswordModalOpen(false);
      setPassword("");
    } catch (submitError) {
      console.error("Error creating user access:", submitError);
      const errMsg =
        submitError instanceof Error
          ? submitError.message
          : "Unable to create account and assign access.";
      setModalError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const existingRoleObj = existingUserRole
    ? roleOptions.find((r) => r.value === existingUserRole.role)
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
            <UserCog size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-blue-700">
                Admin Management
              </span>
              <span className="text-xs text-slate-400">• Role Based Access Control</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Assign Staff Roles & Module Access
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Select an existing staff member or enter a staff Gmail, view their currently configured access, modify permissions, and set authentication credentials.
            </p>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Error</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">Access Assigned Successfully</p>
            <p className="mt-0.5">{message}</p>
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        
        {/* Left Column: Staff Selection / Target Email */}
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900">1. Select Staff Member</h2>
            <p className="text-xs text-slate-500">
              Choose an already registered staff member from your database or enter custom email.
            </p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                setSelectionMode("existing");
                setCustomEmail("");
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                selectionMode === "existing"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Select Existing Staff ({staffs.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectionMode("custom");
                setSelectedStaffId("");
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                selectionMode === "custom"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Enter Custom Gmail
            </button>
          </div>

          {/* Mode A: Select from existing staff */}
          {selectionMode === "existing" ? (
            <div className="space-y-3">
              {/* Search Filter */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search staff by name, email, or designation..."
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Staff List Box */}
              <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-1">
                {loadingStaff ? (
                  <div className="p-6 text-center text-xs text-slate-500">Loading staff records...</div>
                ) : filteredStaff.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">No staff found matching your search.</div>
                ) : (
                  <div className="space-y-1">
                    {filteredStaff.map((staff) => {
                      const isSelected = selectedStaffId === staff.id;
                      return (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => setSelectedStaffId(staff.id)}
                          className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition ${
                            isSelected
                              ? "border border-blue-300 bg-blue-50/90 text-blue-900 shadow-sm"
                              : "border border-transparent hover:bg-white"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">{staff.fullName}</p>
                            <p className="truncate text-xs text-slate-500">
                              {staff.email || "No email assigned"}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              {staff.employmentType || "Staff"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Staff Email Override Input if selected staff missing email */}
              {selectedStaff && !selectedStaff.email && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">
                    Selected staff does not have an email saved.
                  </p>
                  <label className="mt-1 block text-xs font-medium text-amber-900">
                    Enter Gmail address for login:
                  </label>
                  <input
                    type="email"
                    value={staffEmailOverride}
                    onChange={(e) => setStaffEmailOverride(e.target.value)}
                    placeholder="staff.member@gmail.com"
                    className="mt-1 h-9 w-full rounded-lg border border-amber-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>
          ) : (
            /* Mode B: Enter custom Gmail */
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Ramesh Shrestha"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Gmail / Email Address *
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="teacher@gmail.com"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          )}

          {/* Selected Target Summary */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Target User</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
                {targetName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">{targetName}</p>
                <p className="truncate text-xs font-medium text-blue-600">
                  {targetEmail || "No email selected"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Role Template & Module Permissions Form */}
        <form
          onSubmit={handleOpenPasswordModal}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900">2. Configure Role & Access</h2>
            <p className="text-xs text-slate-500">
              View currently set role access, select role template, and customize module permissions.
            </p>
          </div>

          {/* Currently Configured Access Card */}
          {targetEmail && (
            <div className="rounded-xl border p-3.5 text-xs transition duration-150 border-slate-200 bg-slate-50">
              {loadingExistingRole ? (
                <div className="flex items-center gap-2 text-slate-500 py-1">
                  <Loader2 size={15} className="animate-spin text-blue-600" />
                  <span>Fetching currently configured role...</span>
                </div>
              ) : existingUserRole ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                      <ShieldCheck size={13} />
                      Currently Configured
                    </span>
                    <button
                      type="button"
                      onClick={resetToCurrentlySet}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      <RotateCcw size={11} />
                      Reset Form to Set Access
                    </button>
                  </div>
                  <div className="text-slate-800">
                    <p>
                      <strong>Current Role:</strong>{" "}
                      <span className="font-bold text-blue-700">
                        {existingRoleObj?.label ?? existingUserRole.role}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {existingRoleObj?.classFocus ?? "Custom Permissions"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-600">
                  <AlertCircle size={15} className="text-amber-500 shrink-0" />
                  <span>
                    No existing role found for <strong>{targetEmail}</strong>. Setting up new access configuration.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Role Template Selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Role Template
            </label>
            <select
              value={role}
              onChange={(e) => applyRoleTemplate(e.target.value as AppRole)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.classFocus})
                </option>
              ))}
            </select>
          </div>

          {/* Module Access Checkboxes */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Module Access Rights</span>
              <span className="text-[11px] text-slate-400">Toggle allowed modules</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {moduleOptions.map((moduleItem) => {
                const isChecked = !!permissions[moduleItem.value];
                return (
                  <label
                    key={moduleItem.value}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-medium transition cursor-pointer ${
                      isChecked
                        ? "border-blue-200 bg-blue-50/70 text-blue-900"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{moduleItem.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handlePermissionToggle(moduleItem.value)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Trigger Button */}
          <button
            type="submit"
            disabled={!targetEmail}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <KeyRound size={17} />
            {existingUserRole ? "Update Role & Modules" : "Assign Role & Set Password"}
          </button>
        </form>

      </div>

      {/* =========================================================
          PASSWORD CONFIRMATION MODAL
      ========================================================= */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Set Login Password
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure credentials for {targetName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content & Alerts */}
            <div className="mt-4 space-y-4">
              
              {/* Account Details Box */}
              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1 border border-slate-200">
                <p>
                  <strong className="text-slate-700">Account Gmail:</strong>{" "}
                  <span className="font-semibold text-blue-600">{targetEmail}</span>
                </p>
                <p>
                  <strong className="text-slate-700">Role Assigned:</strong>{" "}
                  <span className="font-semibold text-slate-900">
                    {roleOptions.find((r) => r.value === role)?.label ?? role}
                  </span>
                </p>
              </div>

              {modalError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {modalError}
                </div>
              )}

              {/* Password Input */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Enter Login Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-3 pr-10 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  This password will be set in Firebase Auth. Give this password to the staff member to log in.
                </p>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                disabled={submitting}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmRoleAssignment}
                disabled={submitting || !password}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>Setting Up Account...</>
                ) : (
                  <>
                    <UserCheck size={15} />
                    Confirm & Create Login
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
