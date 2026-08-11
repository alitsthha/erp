import { Timestamp } from "firebase/firestore";

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface RolePermissions {
  dashboard: Permission;
  students: Permission;
  activities: Permission;
  enrollments: Permission;
  attendance: Permission;
 billing: Permission;
  expenses: Permission;
  staff: Permission;
  payroll: Permission;
  reports: Permission;
  settings: Permission;
}

export interface Role {
  id: string;

  roleCode: string;

  name: string;

  description: string;

  department: string;

  permissions: RolePermissions;

  color: string;

  displayOrder: number;

  staffCount: number;

  status: "Active" | "Inactive";

  createdAt?: Timestamp;

  updatedAt?: Timestamp;
}