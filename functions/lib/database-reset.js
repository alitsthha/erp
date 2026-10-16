"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATABASE_RESET_PATH = void 0;
exports.assertDatabaseAvailable = assertDatabaseAvailable;
const https_1 = require("firebase-functions/v2/https");
exports.DATABASE_RESET_PATH = "_maintenance/databaseReset";
async function assertDatabaseAvailable(db) {
    if ((await db.doc(exports.DATABASE_RESET_PATH).get()).exists) {
        throw new https_1.HttpsError("failed-precondition", "The database is being cleared. Finish the reset in Settings before making changes.");
    }
}
