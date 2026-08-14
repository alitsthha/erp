import type {
  InvoiceLine,
} from "../types/invoice.types";

/* =========================================================
   HELPERS
========================================================= */

function toNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function roundMoney(value: number): number {
  return (
    Math.round(
      (value + Number.EPSILON) * 100
    ) / 100
  );
}

/* =========================================================
   CALCULATE INVOICE LINE
========================================================= */

export function calculateInvoiceLine(
  line: InvoiceLine
): InvoiceLine {
  const monthlyFee = Math.max(
    0,
    toNumber(line.monthlyFee)
  );

  const expectedSessions = Math.max(
    0,
    Math.floor(
      toNumber(line.expectedSessions)
    )
  );

  let sessionFee = Math.max(
    0,
    toNumber(line.sessionFee)
  );

  if (
    sessionFee <= 0 &&
    monthlyFee > 0 &&
    expectedSessions > 0
  ) {
    sessionFee =
      monthlyFee /
      expectedSessions;
  }

  const sessionCount = Math.max(
    0,
    Math.floor(
      toNumber(line.sessionCount)
    )
  );

  const calculatedAmount =
    sessionCount * sessionFee;

  const amount =
    monthlyFee > 0
      ? Math.min(
          calculatedAmount,
          monthlyFee
        )
      : calculatedAmount;

  return {
    ...line,

    monthlyFee:
      roundMoney(monthlyFee),

    expectedSessions,

    sessionCount,

    sessionFee:
      roundMoney(sessionFee),

    amount:
      roundMoney(amount),
  };
}

/* =========================================================
   CALCULATE INVOICE TOTALS
========================================================= */

export function calculateInvoiceTotals(
  lines: InvoiceLine[],
  discount = 0
) {
  const calculatedLines =
    lines.map(
      calculateInvoiceLine
    );

  const subtotal =
    roundMoney(
      calculatedLines.reduce(
        (total, line) =>
          total + line.amount,
        0
      )
    );

  const safeDiscount =
    roundMoney(
      Math.max(
        0,
        toNumber(discount)
      )
    );

  const totalAmount =
    roundMoney(
      Math.max(
        subtotal -
          safeDiscount,
        0
      )
    );

  return {
    lines:
      calculatedLines,

    subtotal,

    discount:
      safeDiscount,

    totalAmount,
  };
}

/* =========================================================
   CALCULATE DUE AMOUNT
========================================================= */

export function calculateDueAmount(
  totalAmount: number,
  paidAmount: number
): number {
  return roundMoney(
    Math.max(
      toNumber(totalAmount) -
        toNumber(paidAmount),
      0
    )
  );
}