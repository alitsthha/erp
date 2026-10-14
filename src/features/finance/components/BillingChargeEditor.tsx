import { formatBSDate } from "@/utils/nepali-date";
import type { StudentFeeSummary } from "../services/fee-calculation.service";
import type { ActivityBillingSelection, BillingSelection } from "../services/billing-selection.service";

interface Props {
  summary: StudentFeeSummary;
  selection: BillingSelection;
  onChange: (selection: BillingSelection) => void;
  disabled: boolean;
}

export default function BillingChargeEditor({ summary, selection, onChange, disabled }: Props) {
  const update = (id: string, patch: Partial<ActivityBillingSelection>) => onChange({ ...selection, [id]: { ...selection[id], ...patch } });
  return (
    <fieldset disabled={disabled} className="space-y-4 border-b border-slate-200 p-5 sm:p-6">
      <legend className="sr-only">Choose charges for this invoice</legend>
      <div>
        <h3 className="font-semibold text-slate-900">Choose charges for this invoice</h3>
        <p className="mt-1 text-sm text-slate-500">Select activities, months and attended sessions. Totals update immediately. Anything unchecked can be billed later.</p>
      </div>
      {summary.lines.map((line) => {
        const chosen = selection[line.enrollmentId];
        if (!chosen) return null;
        const dates = line.attendanceDates ?? [];
        const months = line.billedMonths ?? [];
        return (
          <div key={line.enrollmentId} className="rounded-xl border border-slate-200 p-4">
            <label className="flex items-center gap-3 font-medium text-slate-900">
              <input type="checkbox" checked={chosen.included} disabled={line.calculatedAmount <= 0} onChange={(event) => update(line.enrollmentId, { included: event.target.checked })} />
              {line.activityName}
              <span className="text-xs font-normal text-slate-500">{line.countedMonthly ? "Monthly" : "Per session"}</span>
            </label>
            {line.calculatedAmount <= 0 ? <p className="mt-2 text-sm text-slate-500">No unbilled charges in this period.</p> : (
              <fieldset disabled={!chosen.included} className="mt-3 space-y-3 disabled:opacity-50">
                <legend className="sr-only">{line.activityName} charges</legend>
                {line.countedMonthly ? (
                  <div className="flex flex-wrap gap-3">
                    {months.map((month) => <label key={month} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <input type="checkbox" checked={chosen.months.includes(month)} onChange={(event) => update(line.enrollmentId, { months: event.target.checked ? [...chosen.months, month] : chosen.months.filter((value) => value !== month) })} />
                      {formatBSDate(`${month}-01`).replace(/^1 /, "")} (BS)
                    </label>)}
                  </div>
                ) : (
                  <>
                    <label className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                      Sessions to bill
                      <input aria-label={`${line.activityName} sessions to bill`} type="number" min={0} max={dates.length} step={1} className="ui-field w-24 px-3" value={chosen.attendanceDates.length}
                        onChange={(event) => update(line.enrollmentId, { attendanceDates: dates.slice(0, Math.max(0, Math.min(dates.length, Math.floor(Number(event.target.value) || 0)))) })} />
                      <span className="text-slate-500">of {dates.length} unbilled sessions</span>
                    </label>
                    <details>
                      <summary className="cursor-pointer text-sm text-brand-700">Choose session dates</summary>
                      <div className="mt-3 flex max-h-60 flex-wrap gap-3 overflow-y-auto">
                        {dates.map((date) => <label key={date} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <input type="checkbox" checked={chosen.attendanceDates.includes(date)} onChange={(event) => update(line.enrollmentId, { attendanceDates: event.target.checked ? [...chosen.attendanceDates, date] : chosen.attendanceDates.filter((value) => value !== date) })} />
                          {formatBSDate(date)}
                        </label>)}
                      </div>
                    </details>
                  </>
                )}
              </fieldset>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
