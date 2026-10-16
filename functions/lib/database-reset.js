"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATABASE_RESET_PATH = void 0;
exports.assertDatabaseAvailable = assertDatabaseAvailable;
exports.clearFirestoreDatabase = clearFirestoreDatabase;
const https_1 = require("firebase-functions/v2/https");
exports.DATABASE_RESET_PATH = "_maintenance/databaseReset";
const RESET_LEASE_MS = 10 * 60 * 1000; // Longer than the callable's 540-second timeout.
async function assertDatabaseAvailable(db) {
    if ((await db.doc(exports.DATABASE_RESET_PATH).get()).exists) {
        throw new https_1.HttpsError("failed-precondition", "The database is being cleared. Finish the reset in Settings before making changes.");
    }
}
async function clearFirestoreDatabase(db, projectId, request, isAdmin) {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Sign in as an administrator to clear the database.");
    if (!projectId)
        throw new https_1.HttpsError("failed-precondition", "The server's Firebase project could not be identified.");
    if (request.data?.projectId !== projectId || request.data?.confirmation !== `DELETE ${projectId}`) {
        throw new https_1.HttpsError("invalid-argument", "The confirmation must match the connected Firebase project.");
    }
    const now = Date.now();
    const authTime = Number(request.auth.token.auth_time) * 1000;
    if (!Number.isFinite(authTime) || now - authTime > 5 * 60 * 1000 || authTime > now + 60_000) {
        throw new https_1.HttpsError("failed-precondition", "Verify your password again before clearing the database.");
    }
    const lock = db.doc(exports.DATABASE_RESET_PATH);
    const previous = (await lock.get()).data();
    // The initiator can finish a partial reset even after user_roles was deleted.
    if (!(await isAdmin()) && previous?.requestedBy !== request.auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Only administrators can clear the database.");
    }
    const uid = request.auth.uid;
    await db.runTransaction(async (transaction) => {
        const active = (await transaction.get(lock)).data();
        if (active?.status === "running" && now - Number(active.startedAtMs) < RESET_LEASE_MS) {
            throw new https_1.HttpsError("already-exists", "A database reset is already running. Wait for it to finish; after an interrupted connection, allow ten minutes before retrying.");
        }
        transaction.set(lock, { requestedBy: uid, status: "running", startedAtMs: now });
    });
    let collectionsCleared = 0;
    try {
        // Discover collections on the server rather than relying on the backup allowlist.
        // recursiveDelete includes nested records and descendants of missing parents.
        for (const collection of await db.listCollections()) {
            if (collection.id === "_maintenance")
                continue;
            await db.recursiveDelete(collection);
            collectionsCleared++;
        }
        for (const reference of await db.collection("_maintenance").listDocuments()) {
            if (reference.path !== exports.DATABASE_RESET_PATH)
                await db.recursiveDelete(reference);
        }
        for (const collection of await lock.listCollections())
            await db.recursiveDelete(collection);
        // Do not claim success if an in-flight server operation recreated records.
        for (const collection of await db.listCollections()) {
            const remaining = await collection.listDocuments();
            if (remaining.some((reference) => reference.path !== exports.DATABASE_RESET_PATH)) {
                throw new Error("Records were added while the reset was running.");
            }
        }
        await lock.delete();
        return { success: true, projectId, collectionsCleared };
    }
    catch (error) {
        console.error("Database reset did not finish", error);
        // Keep writes blocked after a partial failure. A confirmed retry resumes safely.
        await lock.set({ requestedBy: uid, status: "failed", startedAtMs: now });
        throw new https_1.HttpsError("internal", "The database was only partially cleared. Writes remain paused. Retry Clear database to finish; if the connection timed out, wait ten minutes first.");
    }
}
