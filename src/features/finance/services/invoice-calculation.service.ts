import type { InvoiceItem } from "../types/invoice.types";

export function calculateInvoiceItem(
  item: InvoiceItem
): InvoiceItem {
  const quantity = Number(item.quantity) || 0;

  const unitPrice = Number(item.unitPrice) || 0;

  const amount = quantity * unitPrice;

  return {
    ...item,
    quantity,
    unitPrice,
    amount,
  };
}

export function calculateInvoiceTotals(
  items: InvoiceItem[],
  discount = 0,
  adjustment = 0
) {
  const calculatedItems = items.map(calculateInvoiceItem);

  const subtotal = calculatedItems.reduce(
    (total, item) => total + item.amount,
    0
  );

  const safeDiscount = Number(discount) || 0;

  const safeAdjustment = Number(adjustment) || 0;

  const totalAmount =
    subtotal -
    safeDiscount +
    safeAdjustment;

  return {
    items: calculatedItems,

    subtotal,

    discount: safeDiscount,

    adjustment: safeAdjustment,

    totalAmount: Math.max(totalAmount, 0),
  };
}

export function calculateDueAmount(
  totalAmount: number,
  paidAmount: number
) {
  return Math.max(
    Number(totalAmount || 0) -
      Number(paidAmount || 0),
    0
  );
}