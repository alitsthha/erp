import type { StudentFeeSummary } from "./fee-calculation.service";

export interface ActivityBillingSelection {
  included: boolean;
  months: string[];
  attendanceDates: string[];
}
export type BillingSelection = Record<string, ActivityBillingSelection>;

export function defaultBillingSelection(summary: StudentFeeSummary): BillingSelection {
  return Object.fromEntries(summary.lines.map((line) => [line.enrollmentId, {
    included: line.calculatedAmount > 0,
    months: [...(line.billedMonths ?? [])],
    attendanceDates: [...(line.attendanceDates ?? [])],
  }]));
}

/** Re-validate selected fee events against fresh data at generation time.
 * Unselected events remain available for a later invoice.
 */
export function applyBillingSelection(summary: StudentFeeSummary, selection?: BillingSelection): StudentFeeSummary {
  if (!selection) return summary;
  const stale = () => { throw new Error("Selected charges have changed or were already billed. Calculate the bill again before generating it."); };
  for (const [id, value] of Object.entries(selection)) {
    if (value.included && !summary.lines.some((line) => line.enrollmentId === id)) stale();
  }
  const lines = summary.lines.map((line) => {
    const chosen = selection[line.enrollmentId];
    const months = chosen?.included && line.countedMonthly ? [...new Set(chosen.months)].sort() : [];
    const dates = chosen?.included && !line.countedMonthly ? [...new Set(chosen.attendanceDates)].sort() : [];
    if (months.some((month) => !line.billedMonths?.includes(month)) || dates.some((date) => !line.attendanceDates?.includes(date))) stale();
    const monthlyFeeAmount = Math.round(months.length * line.monthlyFee * 100) / 100;
    const sessionAmount = Math.round(dates.length * line.sessionFee * 100) / 100;
    return {
      ...line,
      billedMonths: months,
      attendanceDates: dates,
      attendanceIds: dates.map((date) => line.attendanceIds![line.attendanceDates!.indexOf(date)]),
      attendedSessions: dates.length,
      advanceAttendanceDates: dates.filter((date) => line.advanceAttendanceDates?.includes(date)),
      advanceSessions: dates.filter((date) => line.advanceAttendanceDates?.includes(date)).length,
      monthlyFeeApplied: monthlyFeeAmount > 0,
      monthlyFeeAmount,
      sessionAmount,
      monthlyFeeNote: months.length ? `Selected monthly fees for ${months.join(", ")}.` : "No monthly fees selected.",
      calculatedAmount: Math.round((monthlyFeeAmount + sessionAmount) * 100) / 100,
    };
  });
  const monthlyFeeTotal = Math.round(lines.reduce((sum, line) => sum + line.monthlyFeeAmount, 0) * 100) / 100;
  const sessionFeeTotal = Math.round(lines.reduce((sum, line) => sum + line.sessionAmount, 0) * 100) / 100;
  return { ...summary, lines, monthlyFeeTotal, sessionFeeTotal, totalAmount: Math.round((monthlyFeeTotal + sessionFeeTotal) * 100) / 100 };
}
