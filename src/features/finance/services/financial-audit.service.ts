import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { auth, db } from "@/firebase/config";

function removeUndefinedValues(
  record: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}

export async function recordFinancialAudit(
  action: "ARCHIVE" | "RESTORE",
  collectionName: string,
  recordId: string,
  record: Record<string, unknown>
): Promise<void> {
  const user = auth.currentUser;

  await addDoc(collection(db, "auditLogs"), {
    action,
    collectionName,
    recordId,
    record: removeUndefinedValues(record),
    performedBy: user?.email ?? user?.uid ?? "unknown",
    performedAt: serverTimestamp(),
  });
}
