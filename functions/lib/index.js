"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStudentCascade = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const db = admin.firestore();
exports.deleteStudentCascade = (0, https_1.onCall)(async (request) => {
    const { studentId } = request.data ?? {};
    if (typeof studentId !== "string" || studentId.trim() === "") {
        throw new https_1.HttpsError("invalid-argument", "studentId is required.");
    }
    const studentRef = db.collection("students").doc(studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
        throw new https_1.HttpsError("not-found", "Student not found.");
    }
    const BATCH_LIMIT = 450;
    let batch = db.batch();
    let operations = 0;
    const commitBatch = async () => {
        if (operations === 0)
            return;
        await batch.commit();
        batch = db.batch();
        operations = 0;
    };
    const queueDelete = async (ref) => {
        batch.delete(ref);
        operations += 1;
        if (operations >= BATCH_LIMIT) {
            await commitBatch();
        }
    };
    const deleteCollectionQuery = async (collectionName, field) => {
        const snapshot = await db.collection(collectionName).where(field, "==", studentId).get();
        for (const document of snapshot.docs) {
            await queueDelete(document.ref);
        }
    };
    await deleteCollectionQuery("enrollments", "studentId");
    await deleteCollectionQuery("attendances", "studentId");
    const invoicesSnapshot = await db.collection("invoices").where("studentId", "==", studentId).get();
    for (const invoiceDoc of invoicesSnapshot.docs) {
        const paymentsSnapshot = await invoiceDoc.ref.collection("payments").get();
        for (const paymentDoc of paymentsSnapshot.docs) {
            await queueDelete(paymentDoc.ref);
        }
        await queueDelete(invoiceDoc.ref);
    }
    await queueDelete(studentRef);
    await commitBatch();
    return { success: true };
});
