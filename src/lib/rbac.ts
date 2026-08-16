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
  permissions?: Partial<Record<ModuleName, boolean>> | null
): ModulePermissions {
  const base = createDefaultPermissions("teacher");
  const merged = { ...base };

  if (!permissions) {
    return merged;
  }

  for (const key of moduleNames) {
    merged[key] = permissions[key] ?? base[key];
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

  const base = createDefaultPermissions(role);
  const merged = normalizePermissions({ ...base, ...permissions });
  return !!merged[moduleName];
}

export function getLandingRouteForRole(role: AppRole | null | undefined): string {
  if (role === "admin") {
    return "/dashboard";
  }

  return "/attendance";
}
