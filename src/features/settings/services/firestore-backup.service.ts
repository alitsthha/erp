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
  selectedCollections: readonly string[] = BACKUP_COLLECTIONS,
  onProgress?: (message: string) => void,
): Promise<FirestoreBackup> {
  const collections: FirestoreBackup["collections"] = {};

  for (const collectionName of selectedCollections) {
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

function escapeExcelXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function flattenRecord(value: unknown, prefix = "", result: Record<string, string> = {}): Record<string, string> {
  if (value === null || value === undefined) {
    if (prefix) result[prefix] = "";
    return result;
  }

  if (value instanceof Date) {
    result[prefix] = value.toISOString();
    return result;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    for (const [key, nestedValue] of Object.entries(value)) {
      flattenRecord(nestedValue, prefix ? `${prefix}.${key}` : key, result);
    }
    return result;
  }

  result[prefix] = Array.isArray(value) ? JSON.stringify(value) : String(value);
  return result;
}

function excelCell(value: string, header = false): string {
  const style = header ? ' ss:StyleID="Header"' : "";
  return `<Cell${style}><Data ss:Type="String">${escapeExcelXml(value)}</Data></Cell>`;
}

function safeWorksheetName(name: string): string {
  return name.replace(/[\\/:?*\[\]]/g, "-").slice(0, 31) || "Sheet";
}

export function createExcelBackupFile(backup: FirestoreBackup): Blob {
  const worksheets: string[] = [];
  const summaryRows = [
    ["Collection", "Records"],
    ...Object.entries(backup.collections).map(([name, records]) => [name, String(records.length)]),
    ["Exported at", backup.exportedAt],
  ];

  worksheets.push(`<Worksheet ss:Name="Summary"><Table>${summaryRows
    .map((row, index) => `<Row>${row.map((value) => excelCell(value, index === 0)).join("")}</Row>`)
    .join("")}</Table></Worksheet>`);

  for (const [collectionName, records] of Object.entries(backup.collections)) {
    const flattenedRecords: Record<string, string>[] = records.map((record) => ({
      documentId: record.id,
      ...flattenRecord(record.data),
    }));
    const columns = Array.from(new Set(flattenedRecords.flatMap((record) => Object.keys(record))));
    const rows = [
      `<Row>${columns.map((column) => excelCell(column, true)).join("")}</Row>`,
      ...flattenedRecords.map((record) => `<Row>${columns.map((column) => excelCell(record[column] ?? "")).join("")}</Row>`),
    ];
    worksheets.push(`<Worksheet ss:Name="${escapeExcelXml(safeWorksheetName(collectionName))}"><Table>${rows.join("")}</Table></Worksheet>`);
  }

  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style></Styles>
  ${worksheets.join("\n  ")}
</Workbook>`;

  return new Blob([workbook], { type: "application/vnd.ms-excel" });
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
