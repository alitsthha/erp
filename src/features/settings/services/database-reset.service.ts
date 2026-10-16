import {
  collectionGroup, doc, getDocsFromServer, limit, query,
  runTransaction, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { auth, db, firebaseConfig } from "@/firebase/config";
import { verifyAdminPassword } from "@/features/auth/services/user-role.service";

// Include every collection ID used by the ERP. Collection-group queries also
// find nested records whose parent document has already been deleted.
export const RESET_COLLECTIONS = [
  "payments", "financePayments", "financeIncome", "financeExpenses", "invoices",
  "invoiceLocks", "paymentIdempotencyKeys", "accountingPostings", "journalEntries",
  "accounts", "bankTransactions", "financialPeriods", "payrollRuns", "payrollReservations",
  "financeCategoryRules", "attendances", "daily_attendances", "calendar_entries",
  "enrollments", "students", "activities", "activity_colors", "activity_color_locks",
  "staffAttendance", "salaryConfigs", "staff", "departments", "roles", "counters",
  "auditLogs", "mail", "settings", "user_roles",
] as const;
const RESET_PATH = "_maintenance/databaseReset";
const BATCH_SIZE = 200;
const STALE_AFTER_MS = 5 * 60_000;
let resetting = false;

export function databaseResetErrorMessage(cause: unknown): string {
  const code = (cause as { code?: string })?.code?.replace(/^firestore\//, "");
  const message = cause instanceof Error ? cause.message : "";
  if (code === "permission-denied") return "Database clearing requires administrator access and the latest Firestore security rules. No unreadable collections were skipped. If clearing started, confirm again to finish after access is restored.";
  if (code === "resource-exhausted") return "Firebase's quota has been reached. Some records may already be deleted. Wait for the quota to reset, then confirm again to finish clearing.";
  if (code === "unavailable" || code === "deadline-exceeded") return "The connection was interrupted. Keep this tab open and retry when online. If another reset is reported as running, wait five minutes before retrying.";
  return message || "Clearing could not be completed. Confirm again to finish any remaining deletion.";
}

export async function clearCurrentDatabase(
  confirmation: string,
  password: string,
  onProgress?: (message: string) => void,
) {
  const projectId = firebaseConfig.projectId;
  if (!projectId || confirmation !== `DELETE ${projectId}`) throw new Error("Type the exact confirmation shown for this Firebase project.");
  if (resetting) throw new Error("A database reset is already running in this tab.");
  resetting = true;
  let acquired = false;
  const runId = crypto.randomUUID();
  const lock = doc(db, RESET_PATH);
  let deleted = 0;
  try {
    onProgress?.("Verifying administrator password…");
    await verifyAdminPassword(password);
    const user = auth.currentUser;
    if (!user) throw new Error("Your session has expired. Sign in again.");
    await user.getIdToken(true);
    // Keep a database-backed admin's own role until the same commit that releases
    // the pause, so a failed reset is still reachable after reloading the app.
    const ownRole = user.email ? doc(db, `user_roles/${user.email.trim().toLowerCase()}`) : undefined;
    onProgress?.("Pausing database writes…");
    await runTransaction(db, async (transaction) => {
      const current = await transaction.get(lock);
      const data = current.data();
      if (current.exists() && data?.status === "running" && Date.now() - (data.updatedAt?.toMillis?.() ?? Date.now()) < STALE_AFTER_MS) {
        throw new Error("Another database reset is running. If its tab was closed, wait five minutes before retrying.");
      }
      transaction.set(lock, { mode: "browser", requestedBy: user.uid, runId, status: "running", updatedAt: serverTimestamp() });
    });
    acquired = true;

    // Fail before deleting data if any collection cannot be queried. Never turn
    // denied/offline reads into an empty collection and a false success message.
    for (const name of RESET_COLLECTIONS) {
      await getDocsFromServer(query(collectionGroup(db, name), limit(1)));
    }
    for (const name of RESET_COLLECTIONS) {
      for (;;) {
        onProgress?.(`Clearing ${name} · ${deleted} records deleted`);
        const snapshot = await getDocsFromServer(query(collectionGroup(db, name), limit(BATCH_SIZE)));
        const records = snapshot.docs.filter((record) => record.ref.path !== ownRole?.path);
        if (!records.length) break;
        const batch = writeBatch(db);
        // The heartbeat is in the same atomic commit as the deletes. A stale tab
        // cannot delete records after another administrator takes over its lock.
        batch.update(lock, { runId, updatedAt: serverTimestamp() });
        records.forEach((record) => batch.delete(record.ref));
        await batch.commit();
        deleted += records.length;
      }
    }
    onProgress?.(`Verifying cleared collections · ${deleted} records deleted`);
    for (const name of RESET_COLLECTIONS) {
      const snapshot = await getDocsFromServer(query(collectionGroup(db, name), limit(2)));
      if (snapshot.docs.some((record) => record.ref.path !== ownRole?.path)) throw new Error(`Records remain in ${name}. Confirm again to finish clearing.`);
    }
    const removedOwnRole = await runTransaction(db, async (transaction) => {
      const current = (await transaction.get(lock)).data();
      if (current?.runId !== runId) throw new Error("Another reset took over. Refresh before continuing.");
      const hasOwnRole = ownRole && (await transaction.get(ownRole)).exists();
      if (ownRole && hasOwnRole) transaction.delete(ownRole);
      transaction.delete(lock);
      return Boolean(hasOwnRole);
    });
    if (removedOwnRole) deleted++;
    acquired = false;
    return { success: true, projectId, collectionsCleared: RESET_COLLECTIONS.length, deleted };
  } catch (error) {
    if (acquired) {
      // Retain the pause after a partial deletion, but allow an immediate retry.
      try {
        await runTransaction(db, async (transaction) => {
          if ((await transaction.get(lock)).data()?.runId === runId) {
            transaction.update(lock, { status: "failed", updatedAt: serverTimestamp() });
          }
        });
      } catch { /* A disconnected browser can resume after the five-minute lease. */ }
    }
    throw error;
  } finally {
    resetting = false;
  }
}
