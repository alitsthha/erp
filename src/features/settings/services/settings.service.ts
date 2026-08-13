import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import type { SettingsFormData } from "../types/settings.types";

export const DEFAULT_SETTINGS: SettingsFormData = {
  institutionName: "Academy ERP Institution",
  code: "ERP-2026",
  email: "admin@academy.edu",
  phone: "+977-1-4412345",
  address: "Kathmandu, Nepal",
  website: "https://academy.edu",
  taxId: "PAN-302910482",
  academicYear: "2081/2082",
  currency: "NPR (Rs.)",
  timeZone: "Asia/Kathmandu (+05:45)",
  maintenanceMode: false,
  allowPublicRegistration: false,
  enableEmailNotifications: true,
  enableSmsNotifications: true,
  enableAuditLogs: true,
  defaultLanguage: "English",
  theme: "light",
};

const SETTINGS_DOC_PATH = ["settings", "organization"] as const;

export async function getSettings(): Promise<SettingsFormData> {
  try {
    const docRef = doc(db, SETTINGS_DOC_PATH[0], SETTINGS_DOC_PATH[1]);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return DEFAULT_SETTINGS;
    }

    const data = snapshot.data();
    return {
      ...DEFAULT_SETTINGS,
      ...data,
    } as SettingsFormData;
  } catch (error) {
    console.warn("Failed to fetch settings from Firestore, using default settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(data: SettingsFormData): Promise<void> {
  const docRef = doc(db, SETTINGS_DOC_PATH[0], SETTINGS_DOC_PATH[1]);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });
}
