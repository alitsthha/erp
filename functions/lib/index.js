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
exports.setUserPassword = exports.deleteStudentCascade = exports.assignUserAccess = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const db = admin.firestore();
const allowedRoles = new Set([
    "admin",
    "teacher",
    "multiple_activities_teacher",
    "music_teacher",
    "dance_teacher",
    "art_teacher",
    "sports_teacher",
]);
const allowedModules = new Set([
    "dashboard",
    "students",
    "activities",
    "enrollments",
    "attendance",
    "billing",
    "expenses",
    "staff",
    "payroll",
    "reports",
    "settings",
    "teacherInfo",
]);
const adminEmails = new Set([
    "admin@academy.edu",
    "admin@gmail.com",
    "admin@outlook.com",
    "alitshrestha74@gmail.com",
]);
async function isAdminRequest(request) {
    const email = typeof request.auth?.token?.email === "string"
        ? request.auth.token.email.trim().toLowerCase()
        : "";
    const tokenAdmin = request.auth?.token?.admin === true;
    const fallbackAdmin = adminEmails.has(email);
    if (tokenAdmin || fallbackAdmin)
        return true;
    if (!email)
        return false;
    const roleSnapshot = await db.collection("user_roles").doc(email).get();
    return roleSnapshot.data()?.role === "admin";
}
exports.assignUserAccess = (0, https_1.onCall)(async (request) => {
    if (!(await isAdminRequest(request))) {
        throw new https_1.HttpsError("permission-denied", "Only administrators can assign user access.");
    }
    const data = request.data ?? {};
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const password = typeof data.password === "string" ? data.password : "";
    const role = typeof data.role === "string" ? data.role : "";
    const permissions = data.permissions && typeof data.permissions === "object" ? data.permissions : {};
    const activityIds = Array.isArray(data.activityIds)
        ? data.activityIds.filter((id) => typeof id === "string" && id.trim() !== "").map((id) => id.trim())
        : [];
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new https_1.HttpsError("invalid-argument", "A valid email address is required.");
    }
    if (!allowedRoles.has(role)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid role.");
    }
    if (activityIds.length > 100 || new Set(activityIds).size !== activityIds.length) {
        throw new https_1.HttpsError("invalid-argument", "Activity assignments are invalid.");
    }
    if (role === "admin" && activityIds.length > 0) {
        throw new https_1.HttpsError("invalid-argument", "Administrators cannot be limited to activities.");
    }
    if (activityIds.length > 0) {
        const activitySnapshots = await Promise.all(activityIds.map((activityId) => db.collection("activities").doc(activityId).get()));
        if (activitySnapshots.some((snapshot) => !snapshot.exists)) {
            throw new https_1.HttpsError("invalid-argument", "One or more assigned activities do not exist.");
        }
    }
    const cleanPermissions = {};
    for (const [moduleName, enabled] of Object.entries(permissions)) {
        if (!allowedModules.has(moduleName) || typeof enabled !== "boolean") {
            throw new https_1.HttpsError("invalid-argument", "Invalid module permissions.");
        }
        cleanPermissions[moduleName] = enabled;
    }
    if (role === "admin") {
        for (const moduleName of allowedModules)
            cleanPermissions[moduleName] = true;
    }
    else if (activityIds.length > 0) {
        cleanPermissions.students = true;
        cleanPermissions.attendance = true;
    }
    try {
        let account;
        try {
            account = await admin.auth().getUserByEmail(email);
            if (password) {
                if (password.length < 6) {
                    throw new https_1.HttpsError("invalid-argument", "Password must be at least 6 characters long.");
                }
                account = await admin.auth().updateUser(account.uid, { password });
            }
        }
        catch (error) {
            const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
            if (code !== "auth/user-not-found")
                throw error;
            if (password.length < 6) {
                throw new https_1.HttpsError("invalid-argument", "Password must be at least 6 characters long for a new account.");
            }
            account = await admin.auth().createUser({ email, password });
        }
        await db.collection("user_roles").doc(email).set({
            email,
            role,
            label: typeof data.label === "string" && data.label.trim() ? data.label.trim() : role,
            permissions: cleanPermissions,
            activityIds,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        await admin.auth().setCustomUserClaims(account.uid, {
            role,
            admin: role === "admin",
            permissions: cleanPermissions,
            activityIds,
        });
        return { success: true, uid: account.uid };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error("assignUserAccess failed", error);
        const code = typeof error === "object" && error !== null && "code" in error
            ? String(error.code)
            : "";
        if (code === "auth/email-already-exists") {
            throw new https_1.HttpsError("already-exists", "An Authentication account already exists for this email.");
        }
        if (code === "auth/invalid-password") {
            throw new https_1.HttpsError("invalid-argument", "The password does not meet Firebase requirements.");
        }
        if (code === "auth/invalid-email") {
            throw new https_1.HttpsError("invalid-argument", "The email address is invalid.");
        }
        throw new https_1.HttpsError("internal", "Unable to assign user access. Check that the Functions deployment is up to date and review the Firebase Functions logs.");
    }
});
async function reverseJournalEntry(reference) {
    const postingRef = db.collection("accountingPostings").doc(reference);
    const postingSnapshot = await postingRef.get();
    if (!postingSnapshot.exists)
        return null;
    const posting = postingSnapshot.data() ?? {};
    if (posting.reversalJournalEntryId)
        return String(posting.reversalJournalEntryId);
    const journalRef = db.collection("journalEntries").doc(String(posting.journalEntryId ?? ""));
    const journalSnapshot = await journalRef.get();
    if (!journalSnapshot.exists)
        return null;
    const journal = journalSnapshot.data() ?? {};
    const lines = Array.isArray(journal.lines) ? journal.lines : [];
    const reversalRef = db.collection("journalEntries").doc();
    await db.runTransaction(async (transaction) => {
        const currentPosting = await transaction.get(postingRef);
        if (!currentPosting.exists || currentPosting.data()?.reversalJournalEntryId)
            return;
        const accountRefs = lines
            .map((line) => typeof line?.accountId === "string" ? db.collection("accounts").doc(line.accountId) : null)
            .filter((ref) => ref !== null);
        const accountSnapshots = await Promise.all(accountRefs.map((ref) => transaction.get(ref)));
        for (let index = 0; index < accountRefs.length; index += 1) {
            const accountSnapshot = accountSnapshots[index];
            if (!accountSnapshot.exists)
                continue;
            const line = lines[index] ?? {};
            const debit = Number(line.debit ?? 0);
            const credit = Number(line.credit ?? 0);
            const account = accountSnapshot.data() ?? {};
            const debitNormal = account.accountType === "Asset" || account.accountType === "Expense";
            const originalChange = debitNormal ? debit - credit : credit - debit;
            transaction.update(accountRefs[index], {
                currentBalance: Number(account.currentBalance ?? 0) - originalChange,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        const reversalLines = lines.map((line) => ({
            ...line,
            debit: Number(line.credit ?? 0),
            credit: Number(line.debit ?? 0),
        }));
        transaction.set(reversalRef, {
            entryNumber: `REV-${reversalRef.id.slice(0, 8).toUpperCase()}`,
            entryDate: String(journal.entryDate ?? ""),
            description: `Reversal: ${String(journal.description ?? reference)}`,
            reference: `${reference}-REVERSAL`,
            lines: reversalLines,
            totalDebit: Number(journal.totalCredit ?? 0),
            totalCredit: Number(journal.totalDebit ?? 0),
            status: "Posted",
            reversalOf: journalRef.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        transaction.update(journalRef, {
            status: "Reversed",
            reversedAt: admin.firestore.FieldValue.serverTimestamp(),
            reversalJournalEntryId: reversalRef.id,
        });
        transaction.update(postingRef, {
            reversedAt: admin.firestore.FieldValue.serverTimestamp(),
            reversalJournalEntryId: reversalRef.id,
        });
    });
    return reversalRef.id;
}
exports.deleteStudentCascade = (0, https_1.onCall)(async (request) => {
    const { studentId } = request.data ?? {};
    if (!(await isAdminRequest(request))) {
        throw new https_1.HttpsError("permission-denied", "Only administrators can delete students.");
    }
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
    const invoiceIds = invoicesSnapshot.docs.map((document) => document.id);
    const invoiceLocksSnapshot = await db.collection("invoiceLocks").where("studentId", "==", studentId).get();
    const paymentsSnapshot = await db.collection("financePayments").where("studentId", "==", studentId).get();
    const invoicePayments = invoiceIds.length > 0
        ? await Promise.all(invoiceIds.map((invoiceId) => db.collection("financePayments").where("invoiceId", "==", invoiceId).get()))
        : [];
    const paymentDocs = [
        ...paymentsSnapshot.docs,
        ...invoicePayments.flatMap((snapshot) => snapshot.docs),
    ].filter((document, index, documents) => documents.findIndex((item) => item.id === document.id) === index);
    const paymentIds = paymentDocs.map((document) => document.id);
    const incomeByStudent = await db.collection("financeIncome").where("studentId", "==", studentId).get();
    const incomeByPayment = paymentIds.length > 0
        ? await Promise.all(paymentIds.map((paymentId) => db.collection("financeIncome").where("paymentId", "==", paymentId).get()))
        : [];
    const incomeDocs = [
        ...incomeByStudent.docs,
        ...incomeByPayment.flatMap((snapshot) => snapshot.docs),
    ].filter((document, index, documents) => documents.findIndex((item) => item.id === document.id) === index);
    const accountingSnapshot = await db.collection("accountingPostings").get();
    const accountingReferences = new Set([
        ...paymentIds,
        ...paymentDocs.map((document) => String(document.data().paymentNumber ?? "")),
        ...incomeDocs.map((document) => String(document.data().incomeNumber ?? "")),
        ...invoiceIds,
    ].filter(Boolean));
    for (const posting of accountingSnapshot.docs) {
        if (accountingReferences.has(posting.id)) {
            await reverseJournalEntry(posting.id);
            await queueDelete(posting.ref);
        }
    }
    for (const income of incomeDocs)
        await queueDelete(income.ref);
    for (const payment of paymentDocs)
        await queueDelete(payment.ref);
    for (const invoiceLock of invoiceLocksSnapshot.docs)
        await queueDelete(invoiceLock.ref);
    for (const invoiceDoc of invoicesSnapshot.docs) {
        const paymentsSnapshot = await invoiceDoc.ref.collection("payments").get();
        for (const paymentDoc of paymentsSnapshot.docs) {
            await queueDelete(paymentDoc.ref);
        }
        await queueDelete(invoiceDoc.ref);
    }
    await queueDelete(studentRef);
    await commitBatch();
    await db.collection("auditLogs").add({
        action: "DELETE_STUDENT_CASCADE",
        entityType: "students",
        entityId: studentId,
        deletedInvoiceCount: invoiceIds.length,
        deletedPaymentCount: paymentDocs.length,
        deletedIncomeCount: incomeDocs.length,
        reversedAccountingReferenceCount: accountingReferences.size,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
exports.setUserPassword = (0, https_1.onCall)(async (request) => {
    if (!(await isAdminRequest(request))) {
        throw new https_1.HttpsError("permission-denied", "Only administrators can change user passwords.");
    }
    const email = typeof request.data?.email === "string"
        ? request.data.email.trim().toLowerCase()
        : "";
    const password = typeof request.data?.password === "string" ? request.data.password : "";
    if (!email || !password || password.length < 6) {
        throw new https_1.HttpsError("invalid-argument", "A valid email and password of at least 6 characters are required.");
    }
    try {
        const account = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(account.uid, { password });
        return { success: true };
    }
    catch (error) {
        const code = typeof error === "object" && error !== null && "code" in error
            ? String(error.code)
            : "";
        if (code === "auth/user-not-found") {
            throw new https_1.HttpsError("not-found", "No Firebase Authentication account exists for this email.");
        }
        throw new https_1.HttpsError("internal", "Unable to update the user password.");
    }
});
