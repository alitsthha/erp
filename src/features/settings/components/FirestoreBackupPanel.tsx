import { useRef, useState } from "react";
import { Download, RefreshCw, Upload } from "lucide-react";

import {
  BACKUP_COLLECTIONS,
  exportFirestoreBackup,
  restoreFirestoreBackup,
  type FirestoreBackup,
} from "../services/firestore-backup.service";

export default function FirestoreBackupPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [showBackupOptions, setShowBackupOptions] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([...BACKUP_COLLECTIONS]);

  function toggleCollection(collectionName: string) {
    setSelectedCollections((current) => current.includes(collectionName)
      ? current.filter((item) => item !== collectionName)
      : [...current, collectionName]);
  }

  async function handleBackup() {
    if (selectedCollections.length === 0) {
      setStatus("Select at least one section to download.");
      return;
    }

    if (!window.confirm(`Download backup for ${selectedCollections.length} selected section(s)?`)) {
      return;
    }

    try {
      setShowBackupOptions(false);
      setBusy(true);
      setStatus("Preparing backup...");
      const backup = await exportFirestoreBackup(selectedCollections, setStatus);
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
    <div className="mx-auto mt-6 w-full max-w-5xl">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <RefreshCw size={20} />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">
                Data Management
              </span>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Database Backup & Restore
              </h2>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <p className="text-sm text-slate-500">
            Download a backup of real Firebase records or restore missing records from a backup file.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowBackupOptions(true)}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={16} />
              Download Backup
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={16} />
              Restore Backup
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={(event) => void handleRestore(event)}
              className="hidden"
            />
          </div>

          {showBackupOptions && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="backup-options-title">
              <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                  <h3 id="backup-options-title" className="text-lg font-semibold text-slate-900">Choose backup sections</h3>
                  <p className="mt-1 text-sm text-slate-500">All sections are selected by default. Only checked sections will be downloaded.</p>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 sm:px-6">
                  <span className="text-sm font-medium text-slate-700">{selectedCollections.length} of {BACKUP_COLLECTIONS.length} selected</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCollections(selectedCollections.length === BACKUP_COLLECTIONS.length ? [] : [...BACKUP_COLLECTIONS])}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    {selectedCollections.length === BACKUP_COLLECTIONS.length ? "Clear all" : "Select all"}
                  </button>
                </div>

                <div className="grid gap-2 px-5 py-4 sm:grid-cols-2 sm:px-6">
                  {BACKUP_COLLECTIONS.map((collectionName) => (
                    <label key={collectionName} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedCollections.includes(collectionName)}
                        onChange={() => toggleCollection(collectionName)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{collectionName}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
                  <button type="button" onClick={() => setShowBackupOptions(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="button" onClick={() => void handleBackup()} disabled={selectedCollections.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"><Download size={16} />Confirm & Download</button>
                </div>
              </div>
            </div>
          )}

          {status && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600" aria-live="polite">
              {status}
            </div>
          )}

          <p className="text-xs text-amber-700">
            Restore adds only missing document IDs. Keep downloaded backups in secure storage.
          </p>
        </div>
      </section>
    </div>
  );
}
