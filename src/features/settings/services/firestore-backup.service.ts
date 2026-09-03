import {
  collection,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/firebase/config";

export const BACKUP_COLLECTIONS = [
  "students",
  "activities",
  "enrollments",
  "attendances",
  "daily_attendances",
  "staff",
  "staffAttendance",
  "departments",
  "roles",
  "salaryConfigs",
  "invoices",
  "financePayments",
  "financeIncome",
  "financeExpenses",
  "accounts",
  "bankTransactions",
  "financialPeriods",
  "journalEntries",
  "payrollRuns",
  "payrollReservations",
  "financeCategoryRules",
  "counters",
  "auditLogs",
  "user_roles",
] as const;

export interface FirestoreBackup {
  format: "academy-erp-firestore-backup";
  version: 1;
  exportedAt: string;
  collections: Record<string, Array<{ id: string; data: Record<string, unknown> }>>;
}

export async function exportFirestoreBackup(
  onProgress?: (message: string) => void,
): Promise<FirestoreBackup> {
  const collections: FirestoreBackup["collections"] = {};

  for (const collectionName of BACKUP_COLLECTIONS) {
    onProgress?.(`Reading ${collectionName}...`);
    const snapshot = await getDocs(collection(db, collectionName));
    collections[collectionName] = snapshot.docs.map((item) => ({
      id: item.id,
      data: item.data() as Record<string, unknown>,
    }));
  }

  return {
    format: "academy-erp-firestore-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    collections,
  };
}

export async function restoreFirestoreBackup(
  backup: FirestoreBackup,
  onProgress?: (message: string) => void,
): Promise<{ restored: number; skipped: number }> {
  if (
    !backup ||
    backup.format !== "academy-erp-firestore-backup" ||
    backup.version !== 1 ||
    !backup.collections ||
    typeof backup.collections !== "object"
  ) {
    throw new Error("This backup file is not compatible with this system.");
  }

  let restored = 0;
  let skipped = 0;
  let batch = writeBatch(db);
  let operations = 0;

  const commitBatch = async () => {
    if (operations === 0) return;
    await batch.commit();
    batch = writeBatch(db);
    operations = 0;
  };

  for (const collectionName of BACKUP_COLLECTIONS) {
    const records = backup.collections[collectionName] ?? [];
    if (records.length === 0) continue;

    onProgress?.(`Restoring ${collectionName}...`);
    const existingSnapshot = await getDocs(collection(db, collectionName));
    const existingIds = new Set(existingSnapshot.docs.map((item) => item.id));

    for (const record of records) {
      if (!record || typeof record.id !== "string" || !record.data || typeof record.data !== "object") {
        throw new Error(`Invalid record found in ${collectionName}.`);
      }

      const recordRef = doc(db, collectionName, record.id);
      if (existingIds.has(record.id)) {
        skipped += 1;
        continue;
      }

      batch.set(recordRef, record.data);
      operations += 1;
      restored += 1;
      if (operations >= 450) await commitBatch();
    }
  }

  await commitBatch();
  return { restored, skipped };
}
