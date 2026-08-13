export interface OrganizationSettings {
  institutionName: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  taxId: string; // PAN or VAT Number
  academicYear: string;
  currency: string;
  timeZone: string;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  allowPublicRegistration: boolean;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  enableAuditLogs: boolean;
  defaultLanguage: string;
  theme: "light" | "dark" | "system";
}

export type SettingsFormData = OrganizationSettings & SystemSettings;
