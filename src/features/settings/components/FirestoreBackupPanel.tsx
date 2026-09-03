import { useRef, useState } from "react";
import { Download, RefreshCw, Upload } from "lucide-react";

import {
  exportFirestoreBackup,
  restoreFirestoreBackup,
  type FirestoreBackup,
} from "../services/firestore-backup.service";

export default function FirestoreBackupPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleBackup() {
    try {
      setBusy(true);
      setStatus("Preparing backup...");
      const backup = await exportFirestoreBackup(setStatus);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `academy-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Backup downloaded successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Backup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!window.confirm("Restore missing records from this backup? Existing records will not be overwritten.")) {
      return;
    }

    try {
      setBusy(true);
      setStatus("Reading backup file...");
      const backup = JSON.parse(await file.text()) as FirestoreBackup;
      const result = await restoreFirestoreBackup(backup, setStatus);
      setStatus(`Restore complete: ${result.restored} restored, ${result.skipped} existing records skipped.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Restore failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-blue-100 p-3 text-blue-700"><RefreshCw size={20} /></div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Database Backup & Restore</h2>
          <p className="mt-1 text-sm text-slate-500">Download a backup of real Firebase records or restore missing records from a backup file.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => void handleBackup()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          <Download size={16} /> Download Backup
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50">
          <Upload size={16} /> Restore Backup
        </button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={(event) => void handleRestore(event)} className="hidden" />
      </div>
      {status && <p className="mt-4 text-sm text-slate-600" aria-live="polite">{status}</p>}
      <p className="mt-3 text-xs text-amber-700">Restore adds only missing document IDs. Keep downloaded backups in secure storage.</p>
    </section>
  );
}
