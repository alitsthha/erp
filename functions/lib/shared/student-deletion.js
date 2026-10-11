"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnpaidInvoices = getUnpaidInvoices;
exports.requireClearedPayments = requireClearedPayments;
/** Invoice balances are authoritative; attendance billing fields are not settled by payments. */
function getUnpaidInvoices(invoices) {
    return invoices.flatMap(({ id, data }) => {
        if (data.status === "Cancelled")
            return [];
        const total = Number(data.totalAmount ?? data.dueAmount);
        const paid = Number(data.paidAmount ?? 0);
        const recordedDue = Number(data.dueAmount ?? Math.max(total - paid, 0));
        if (![total, paid, recordedDue].every(Number.isFinite) || total < 0 || paid < 0 || recordedDue < 0) {
            throw new Error(`Cannot verify payment clearance for invoice ${data.invoiceNumber || id}. Correct its payment totals before deleting the student.`);
        }
        const dueAmount = Math.round(Math.max(0, total - paid, recordedDue) * 100) / 100;
        return dueAmount > 0 ? [{ id, invoiceNumber: String(data.invoiceNumber || id), dueAmount }] : [];
    });
}
function requireClearedPayments(invoices) {
    const unpaid = getUnpaidInvoices(invoices);
    if (unpaid.length) {
        const outstanding = unpaid.reduce((sum, invoice) => sum + invoice.dueAmount, 0);
        throw new Error(`Cannot delete student: Rs. ${outstanding.toFixed(2)} is outstanding across ${unpaid.length} invoice(s). Clear all payments first.`);
    }
}
