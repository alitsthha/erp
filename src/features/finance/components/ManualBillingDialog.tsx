import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";
import { useUnsavedWork } from "@/hooks/useUnsavedWork";
import { getActivitiesForEnrollment } from "@/features/enrollments/services/enrollment.service";
import type { Activity } from "@/features/activities/types/activity.types";
import { validateManualBillingSessions, type ManualBillingSession } from "../services/manual-billing.service";
import { getKathmanduToday } from "@/utils/calendar-date";

type Props = {
  studentName: string;
  onClose: () => void;
  onSave: (sessions: ManualBillingSession[]) => Promise<void>;
};

export default function ManualBillingDialog({ studentName, onClose, onSave }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const nextId = useRef(1);
  const savingRef = useRef(false);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const [rows, setRows] = useState(() => [{ id: 0, activityId: "", dateBS: getKathmanduToday().bs }]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useUnsavedWork(rows.some((row) => Boolean(row.activityId)));

  useEffect(() => {
    // The picker portals its menu to body, so use a non-top-layer dialog with
    // our backdrop/focus boundary; native showModal() would make the menu inert.
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.show();
    const focusable = () => [...element.querySelectorAll<HTMLElement>("button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex='0']")];
    focusable()[0]?.focus();
    const keepFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (!element.contains(target) && !target.closest(".erp-bs-datepicker-menu")) focusable()[0]?.focus();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape" && !savingRef.current) {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const inputs = focusable();
        const active = document.activeElement;
        if (event.shiftKey && active === inputs[0]) { event.preventDefault(); inputs.at(-1)?.focus(); }
        else if (!event.shiftKey && active === inputs.at(-1)) { event.preventDefault(); inputs[0]?.focus(); }
      }
    };
    document.addEventListener("focusin", keepFocus);
    document.addEventListener("keydown", handleKey);
    let cancelled = false;
    getActivitiesForEnrollment().then((items) => {
      if (!cancelled) setActivities(items.filter((item) => item.status === "Active"));
    }).catch(() => {
      if (!cancelled) setError("Unable to load activities. Close this form and try again.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("focusin", keepFocus);
      document.removeEventListener("keydown", handleKey);
      previousFocus?.focus();
    };
  }, []);

  const update = (id: number, patch: Partial<ManualBillingSession>) => {
    setRows((items) => items.map((row) => row.id === id ? { ...row, ...patch } : row));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave(validateManualBillingSessions(rows));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save manual billing. Please retry.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <><div aria-hidden="true" className="fixed inset-0 z-50 bg-slate-950/40" />
    <dialog ref={dialog} aria-modal="true" aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!savingRef.current) onClose(); }}
    className="fixed inset-0 z-50 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl backdrop:bg-slate-950/40 sm:p-6">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 id={titleId} className="ui-section-title">Manual billing · {studentName}</h2>
        <p className="mt-2 text-sm text-slate-600">Choose each activity and its Nepali session date. Past and future dates are supported, including sessions billed in advance. Add a row for each session.</p>
      </div>
      <button type="button" aria-label="Close manual billing" disabled={saving} onClick={onClose} className="ui-button"><X size={18} /></button>
    </div>
    <form onSubmit={submit}>
      <fieldset disabled={saving || loading} className="space-y-4">
        <legend className="sr-only">Past and advance sessions</legend>
        {loading ? <p role="status" className="text-sm text-slate-500">Loading activities…</p> : rows.map((row, index) => {
          const activity = activities.find((item) => item.id === row.activityId);
          return <div key={row.id} className="grid grid-cols-1 items-end gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <label htmlFor={`${titleId}-${row.id}`} className="mb-1.5 block text-sm font-medium">Activity {index + 1}</label>
              <select id={`${titleId}-${row.id}`} value={row.activityId} onChange={(event) => update(row.id, { activityId: event.target.value })} className="ui-field w-full px-3">
                <option value="">Select activity</option>
                {activities.map((item) => <option key={item.id} value={item.id}>{item.activityName}</option>)}
              </select>
              {activity && <p className="mt-1 text-xs text-slate-500">Rs. {Number(activity.countedMonthly ? activity.feePerMonth ?? 0 : activity.feePerSession ?? activity.sessionFee ?? activity.fee ?? 0).toLocaleString()} / {activity.countedMonthly ? "month" : "session"} · existing enrollment rates apply</p>}
            </div>
            <NepaliDatePickerInput label={`Session ${index + 1} date (BS)`} required disabled={saving || loading} value={row.dateBS} onChange={(dateBS) => { if (!savingRef.current) update(row.id, { dateBS }); }} />
            <button type="button" aria-label={`Remove session ${index + 1}`} disabled={rows.length === 1} className="ui-button text-red-600" onClick={() => setRows((items) => items.filter((item) => item.id !== row.id))}><Trash2 size={17} /></button>
          </div>;
        })}
        {!loading && !activities.length && <p className="text-sm text-slate-600">Create an active activity before using manual billing.</p>}
        <button type="button" disabled={rows.length >= 50 || !activities.length} className="ui-button inline-flex items-center gap-2 border border-slate-200" onClick={() => setRows((items) => [...items, { id: nextId.current++, activityId: "", dateBS: items.at(-1)?.dateBS || getKathmanduToday().bs }])}><Plus size={16} />Add session</button>
        <p className="text-sm text-slate-600">Saving creates missing enrollments, reactivates revoked enrollments, and records attendance on the selected dates, including future sessions. Enrollment start dates move earlier if needed. Future sessions are included in this bill as advance sessions. Existing attendance is reused. Monthly activities are charged once per selected BS month.</p>
      </fieldset>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} disabled={saving} className="ui-button border border-slate-200">Cancel</button>
        <button type="submit" disabled={saving || loading || !activities.length} className="ui-button inline-flex items-center gap-2 bg-brand-600 text-white disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />}{saving ? "Saving and calculating…" : "Save sessions & calculate bill"}</button>
      </div>
    </form>
  </dialog></>;
}
