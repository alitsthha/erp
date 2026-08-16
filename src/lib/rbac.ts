export type AppRole =
  | "admin"
  | "teacher"
  | "music_teacher"
  | "dance_teacher"
  | "art_teacher"
  | "sports_teacher";

export const moduleNames = [
  "dashboard",
  "students",
  "activities",
  "enrollments",
  "attendance",
  "billing",
  "expenses",
  "staff",
  "payroll",
  "reports",
  "settings",
  "teacherInfo",
] as const;

export type ModuleName = (typeof moduleNames)[number];
export type ModulePermissions = Record<ModuleName, boolean>;

export const moduleOptions: { value: ModuleName; label: string }[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "students", label: "Students" },
  { value: "activities", label: "Activities" },
  { value: "enrollments", label: "Enrollments" },
  { value: "attendance", label: "Attendance" },
  { value: "billing", label: "Billing" },
  { value: "expenses", label: "Expenses" },
  { value: "staff", label: "Staff" },
  { value: "payroll", label: "Payroll" },
  { value: "reports", label: "Reports" },
  { value: "settings", label: "Settings" },
  { value: "teacherInfo", label: "Teacher Info" },
];

export const roleOptions: { value: AppRole; label: string; classFocus?: string }[] = [
  { value: "admin", label: "Admin", classFocus: "All modules" },
  { value: "teacher", label: "General Teacher", classFocus: "General access" },
  { value: "music_teacher", label: "Music Teacher", classFocus: "Music class only" },
  { value: "dance_teacher", label: "Dance Teacher", classFocus: "Dance class only" },
  { value: "art_teacher", label: "Art Teacher", classFocus: "Art class only" },
  { value: "sports_teacher", label: "Sports Teacher", classFocus: "Sports class only" },
];

export const defaultPermissionsByRole: Record<AppRole, ModulePermissions> = {
  admin: {
    dashboard: true,
    students: true,
    activities: true,
    enrollments: true,
    attendance: true,
    billing: true,
    expenses: true,
    staff: true,
    payroll: true,
    reports: true,
    settings: true,
    teacherInfo: true,
  },
  teacher: {
    dashboard: false,
    students: false,
    activities: false,
    enrollments: false,
    attendance: true,
    billing: false,
    expenses: false,
    staff: false,
    payroll: false,
    reports: false,
    settings: false,
    teacherInfo: true,
  },
  music_teacher: {
    dashboard: false,
    students: true,
    activities: false,
    enrollments: false,
    attendance: true,
    billing: false,
    expenses: false,
    staff: false,
    payroll: false,
    reports: false,
    settings: false,
    teacherInfo: true,
  },
  dance_teacher: {
    dashboard: false,
    students: true,
    activities: false,
    enrollments: false,
    attendance: true,
    billing: false,
    expenses: false,
    staff: false,
    payroll: false,
    reports: false,
    settings: false,
    teacherInfo: true,
  },
  art_teacher: {
    dashboard: false,
    students: true,
    activities: false,
    enrollments: false,
    attendance: true,
    billing: false,
    expenses: false,
    staff: false,
    payroll: false,
    reports: false,
    settings: false,
    teacherInfo: true,
  },
  sports_teacher: {
    dashboard: false,
    students: true,
    activities: false,
    enrollments: false,
    attendance: true,
    billing: false,
    expenses: false,
    staff: false,
    payroll: false,
    reports: false,
    settings: false,
    teacherInfo: true,
  },
};

export function createDefaultPermissions(role: AppRole): ModulePermissions {
  return { ...defaultPermissionsByRole[role] };
}

export function normalizePermissions(
  permissions?: Partial<Record<ModuleName, boolean>> | null,
  role: AppRole = "teacher"
): ModulePermissions {
  const base = createDefaultPermissions(role);
  const merged = { ...base };

  if (!permissions) {
    return merged;
  }

  for (const key of moduleNames) {
    if (typeof permissions[key] === "boolean") {
      merged[key] = permissions[key]!;
    }
  }

  return merged;
}

export function getRoleLabel(role: AppRole | null | undefined): string {
  if (!role) {
    return "Unassigned";
  }

  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

export function getRoleClassFocus(role: AppRole | null | undefined): string {
  if (!role) {
    return "No assigned class";
  }

  return roleOptions.find((option) => option.value === role)?.classFocus ?? "General access";
}

export function hasModuleAccess(
  role: AppRole | null | undefined,
  moduleName: ModuleName,
  permissions?: Partial<Record<ModuleName, boolean>> | null
): boolean {
  if (!role) {
    return false;
  }

  if (role === "admin") {
    return true;
  }

  const merged = normalizePermissions(permissions, role);
  return !!merged[moduleName];
}

export function getLandingRouteForRole(role: AppRole | null | undefined): string {
  if (role === "admin") {
    return "/dashboard";
  }

  return "/attendance";
}

export function isActivityAllowedForRole(
  role: AppRole | null | undefined,
  activityName?: string | null,
  activityCode?: string | null
): boolean {
  if (!role || role === "admin" || role === "teacher") {
    return true;
  }

  const name = (activityName || "").toLowerCase();
  const code = (activityCode || "").toLowerCase();
  const full = `${name} ${code}`;

  switch (role) {
    case "art_teacher":
      return (
        full.includes("art") ||
        full.includes("draw") ||
        full.includes("paint") ||
        full.includes("sketch") ||
        full.includes("craft")
      );

    case "music_teacher":
      return (
        full.includes("music") ||
        full.includes("sing") ||
        full.includes("vocal") ||
        full.includes("piano") ||
        full.includes("guitar") ||
        full.includes("violin") ||
        full.includes("instrument") ||
        full.includes("harmonium") ||
        full.includes("tabla")
      );

    case "dance_teacher":
      return (
        full.includes("dance") ||
        full.includes("ballet") ||
        full.includes("hiphop") ||
        full.includes("salsa") ||
        full.includes("classical")
      );

    case "sports_teacher":
      return (
        full.includes("sport") ||
        full.includes("taekwondo") ||
        full.includes("karate") ||
        full.includes("football") ||
        full.includes("cricket") ||
        full.includes("basketball") ||
        full.includes("swimming") ||
        full.includes("martial") ||
        full.includes("futsal") ||
        full.includes("volleyball")
      );

    default:
      return true;
  }
}
