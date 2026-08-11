// src/lib/utils/currency.ts

export const CURRENCY_CODE = "NPR";
export const CURRENCY_SYMBOL = "Rs.";

/**
 * Format Nepalese Rupees.
 *
 * Example:
 * formatCurrency(8500)
 * => Rs. 8,500
 */
export function formatCurrency(
  amount: number | string | null | undefined
): string {
  const numericAmount = Number(amount ?? 0);

  if (!Number.isFinite(numericAmount)) {
    return `${CURRENCY_SYMBOL} 0`;
  }

  return `${CURRENCY_SYMBOL} ${numericAmount.toLocaleString("en-NP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format Nepalese Rupees with exactly 2 decimals.
 *
 * Example:
 * formatCurrencyWithDecimals(8500)
 * => Rs. 8,500.00
 */
export function formatCurrencyWithDecimals(
  amount: number | string | null | undefined
): string {
  const numericAmount = Number(amount ?? 0);

  if (!Number.isFinite(numericAmount)) {
    return `${CURRENCY_SYMBOL} 0.00`;
  }

  return `${CURRENCY_SYMBOL} ${numericAmount.toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Convert formatted currency back to a number.
 *
 * Example:
 * parseCurrency("Rs. 8,500")
 * => 8500
 */
export function parseCurrency(
  value: string | number | null | undefined
): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleanedValue = value.replace(/[^\d.-]/g, "");
  const numericValue = Number(cleanedValue);

  return Number.isFinite(numericValue) ? numericValue : 0;
}