import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { firebaseConfig, firebaseEnvironment } from "@/firebase/config";
import { clearCurrentDatabase, databaseResetErrorMessage } from "../services/database-reset.service";

export default function ClearDatabasePanel({ disabled, onBusyChange }: {
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cleared, setCleared] = useState(false);
  const projectId = firebaseConfig.projectId;
  const expected = `DELETE ${projectId}`;

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  function close() {
    if (submitting.current) return;
    setOpen(false);
    setPassword("");
    setConfirmation("");
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || disabled || !password || confirmation !== expected) return;
    submitting.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    let succeeded = false;
    try {
      await clearCurrentDatabase(confirmation, password);
      succeeded = true;
      setCleared(true);
      setOpen(false);
    } catch (cause) {
      setError(databaseResetErrorMessage(cause));
    } finally {
      setPassword("");
      setBusy(false);
      submitting.current = false;
      // A reload discards all pre-reset records still held by the application.
      if (!succeeded) onBusyChange(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 font-semibold text-red-800"><AlertTriangle size={18} />Clear database</h3>
      <p className="mt-2 text-sm text-slate-700">
        Permanently delete all records and nested collections in the current Firestore database,
        including students, attendance, finances, settings, and saved role assignments.
        Firebase login accounts and uploaded files remain. This cannot be undone.
      </p>
      <p className="mt-2 break-all text-sm text-slate-700">
        Connected project: <strong>{projectId}</strong> · <strong className="capitalize">{firebaseEnvironment}</strong>
      </p>
      <p className="mt-2 text-xs text-slate-600">Backup &amp; Restore above covers only its listed sections, not a complete database export.</p>
      {cleared ? (
        <div className="mt-4" role="status">
          <p className="text-sm font-medium text-emerald-800">The Firestore database in {projectId} has been cleared.</p>
          <button type="button" onClick={() => window.location.reload()} className="ui-button mt-3 border border-slate-300 bg-white text-slate-700">Reload application</button>
        </div>
      ) : (
        <button type="button" disabled={disabled || !projectId} onClick={() => setOpen(true)}
          className="ui-button mt-4 inline-flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
          <Trash2 size={16} />Clear database…
        </button>
      )}
      <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); close(); }}
        aria-labelledby="clear-database-title" aria-describedby="clear-database-description"
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-0 shadow-2xl backdrop:bg-slate-950/50">
        <form onSubmit={(event) => void submit(event)} className="space-y-4 p-6" aria-busy={busy}>
          <h3 id="clear-database-title" className="text-lg font-semibold text-red-800">Permanently clear database?</h3>
          <p id="clear-database-description" className="text-sm text-slate-600">
            This deletes every Firestore record in <strong>{projectId}</strong> ({firebaseEnvironment}), including nested records.
            All app writes will pause until clearing finishes. Keep this window open.
          </p>
          <label className="block text-sm text-slate-700">
            Type <strong className="break-all select-all">{expected}</strong> to confirm
            <input autoComplete="off" spellCheck={false} value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
              disabled={busy} required className="ui-field mt-2 w-full px-3" />
          </label>
          <label className="block text-sm text-slate-700">
            Your admin password
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)}
              disabled={busy} required className="ui-field mt-2 w-full px-3" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {busy && <p role="status" className="text-sm text-slate-600">Clearing the database. Large databases may take several minutes…</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" disabled={busy} onClick={close} className="ui-button border border-slate-300 text-slate-700 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={busy || confirmation !== expected || !password}
              className="ui-button bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Clearing…" : "Permanently clear database"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
