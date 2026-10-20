import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSessionState } from "@/hooks/useSessionState";
import { getCurrentBSDate, formatBSDate } from "@/utils/nepali-date";
import type { FinanceDateFilter } from "../types/finance.types";
import { subscribeBillingPreviewData, type BillingPreviewData } from "../services/fee-calculation.service";
import { calculateBillingRoster, type BillingRosterReport, resolveUnbilledBillingPeriod } from "../services/unbilled-bills.service";
import FinanceDateRange from "./FinanceDateRange";

const currency = (amount: number) => `Rs. ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function UnbilledBillsSection() {
  const today = getCurrentBSDate();
  const [range, setRange] = useSessionState<FinanceDateFilter>("finance:billing:unbilledMonthlyRange", { startDate: today, endDate: today });
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: object; report?: BillingRosterReport; error: string } | null>(null);
  const { startDate, endDate } = range;
  const valid = Boolean(startDate && endDate && startDate <= endDate);
  const [source, setSource] = useState<{ retry: number; data?: BillingPreviewData; error?: string } | null>(null);
  const data = source?.retry === retry ? source.data : undefined;
  const sourceError = source?.retry === retry ? source.error : undefined;
  const key = useMemo(() => ({ startDate, endDate, data }), [startDate, endDate, data]);

  useEffect(() => subscribeBillingPreviewData(
    (value) => setSource({ retry, data: value }),
    (error) => setSource({ retry, error: error.message }),
  ), [retry]);

  useEffect(() => {
    if (!valid || !startDate || !endDate || !data) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void calculateBillingRoster(data, startDate, endDate).then((report) => {
        if (!active) return;
        setResult({ key, report, error: "" });
      }).catch((error: unknown) => {
        if (active) setResult({ key, error: error instanceof Error ? error.message : "Unable to load ungenerated bills." });
      });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [startDate, endDate, valid, key, data]);

  const current = result?.key === key ? result : null;
  let periodLabel = "Select billing run dates.";
  if (valid && startDate && endDate) {
    try {
      const period = resolveUnbilledBillingPeriod(startDate, endDate);
      periodLabel = `Billing period: ${formatBSDate(period.startDate)} to ${formatBSDate(period.endDate)} (BS)`;
    } catch { periodLabel = "Select a valid billing period."; }
  }
  return (
    <section className="ui-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="ui-section-title">Bills not generated</h2>
        <button type="button" className="ui-button border border-slate-200 text-sm text-slate-700" onClick={() => setRetry((value) => value + 1)}>Refresh data</button>
      </div>
      <p className="mb-4 mt-1 text-sm text-slate-500">Choose billing run dates (BS). Days 1–4 cover the previous month; days 5 onward cover the selected month. Bills cover the whole corresponding month. The count marks a student as billed when an invoice date falls within the exact selected from/to dates. Students without calculated fees are shown for review.</p>
      <FinanceDateRange value={range} onChange={setRange} description={periodLabel} />
      {!valid ? <p className="text-sm text-slate-500">Select both from and to dates in a valid order.</p> : sourceError ? (
        <div role="alert" className="text-sm text-red-600">{sourceError} <button type="button" onClick={() => setRetry((value) => value + 1)} className="underline">Retry</button></div>
      ) : !data || !current ? (
        <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Checking ungenerated bills...</p>
      ) : current.error ? (
        <div role="alert" className="text-sm text-red-600">{current.error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="underline">Retry</button></div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            {current.report!.totalStudents} students = {current.report!.generatedStudents} billed within the selected dates + {current.report!.pending.length} missing bills.
            {" "}{current.report!.readyCount} have calculated fees; {current.report!.reviewCount} need review.
          </p>
          <details key={`${startDate}:${endDate}`}>
            <summary className="cursor-pointer rounded-xl bg-slate-50 p-4 font-medium text-slate-900">
              <span className="mr-2 text-2xl font-bold">{current.report!.pending.length}</span> students without a bill in the selected dates
              <span className="ml-3 text-sm text-slate-600">{currency(current.report!.totalAmount)} in calculated fees · Expand to view</span>
            </summary>
            {current.report!.pending.length === 0 ? <p className="mt-4 text-sm text-slate-500">Every current student has an invoice dated within the selected range.</p> : (
              <div className="mt-4 space-y-3">
                {current.report!.pending.map(({ student, summary, billingMonths, reason }) => (
                  <details key={student.id} className="rounded-xl border border-slate-200 p-4">
                    <summary className="cursor-pointer font-medium text-slate-900">
                      {student.fullName} · {student.studentCode}
                      <span className="ml-3">{summary ? currency(summary.totalAmount) : "Needs review"}</span>
                    </summary>
                    <p className="mt-2 text-sm text-slate-500">Fee period: {billingMonths.join(", ")} (BS)</p>
                    {reason ? <p className="mt-2 text-sm text-amber-700">{reason}</p> : summary && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="ui-table">
                          <thead className="ui-table-head"><tr><th className="px-3 py-2">Activity</th><th className="px-3 py-2">Unbilled months / session dates (BS)</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
                          <tbody>{summary.lines.filter((line) => line.calculatedAmount > 0).map((line) => <tr key={line.enrollmentId}><td className="px-3 py-2">{line.activityName}</td><td className="px-3 py-2">{(line.countedMonthly ? line.billedMonths : line.attendanceDates)?.join(", ")}</td><td className="px-3 py-2 text-right">{currency(line.calculatedAmount)}</td></tr>)}</tbody>
                        </table>
                      </div>
                    )}
                  </details>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">Counts all current students, including those with no calculated fees. Already billed means a non-cancelled invoice is dated within the selected from/to range, including both days; repeated invoices for one student count once. Amounts are before discounts and advances. Student, invoice and attendance changes update this list automatically.</p>
          </details>
        </div>
      )}
    </section>
  );
}
