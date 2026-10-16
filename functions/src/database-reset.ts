import type { Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export const DATABASE_RESET_PATH = "_maintenance/databaseReset";

export async function assertDatabaseAvailable(db: Firestore): Promise<void> {
  if ((await db.doc(DATABASE_RESET_PATH).get()).exists) {
    throw new HttpsError("failed-precondition", "The database is being cleared. Finish the reset in Settings before making changes.");
  }
}
