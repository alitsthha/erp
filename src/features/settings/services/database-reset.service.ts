import { httpsCallable } from "firebase/functions";
import { auth, firebaseConfig, functions } from "@/firebase/config";
import { verifyAdminPassword } from "@/features/auth/services/user-role.service";

export function databaseResetErrorMessage(cause: unknown): string {
  const code = (cause as { code?: string })?.code;
  const message = cause instanceof Error ? cause.message : "";
  if (code === "functions/not-found") {
    return "Database clearing is not available on this Firebase project yet. Ask your administrator to deploy the database-clearing service and its security rules.";
  }
  // The callable SDK reports a blocked preflight or non-callable response as
  // 'internal'. Preserve detailed server errors, especially partial deletions.
  if (code === "functions/internal" && (!message || /^internal(?: server error)?$/i.test(message))) {
    return "Could not reach the database-clearing service. It may not be deployed or accessible on this Firebase project. Check the service setup and connection before retrying. If clearing already started, wait ten minutes before retrying.";
  }
  if (code === "functions/deadline-exceeded" || code === "functions/unavailable" || code === "functions/cancelled") {
    return "The connection ended before clearing could be confirmed. The reset may still be running. Wait ten minutes, then confirm again to finish any remaining deletion.";
  }
  return message || "The reset could not be confirmed. It may still be running; wait ten minutes before retrying.";
}

export async function clearCurrentDatabase(confirmation: string, password: string) {
  const projectId = firebaseConfig.projectId;
  if (!projectId || confirmation !== `DELETE ${projectId}`) {
    throw new Error("Type the exact confirmation shown for this Firebase project.");
  }
  await verifyAdminPassword(password);
  if (!auth.currentUser) throw new Error("Your session has expired. Sign in again.");
  await auth.currentUser.getIdToken(true);
  const clear = httpsCallable<
    { projectId: string; confirmation: string },
    { success: boolean; projectId: string; collectionsCleared: number }
  >(functions, "clearDatabase", { timeout: 540_000 });
  const result = await clear({ projectId, confirmation });
  if (!result.data.success || result.data.projectId !== projectId) {
    throw new Error("Database clearing could not be confirmed. Check the project before retrying.");
  }
  return result.data;
}
