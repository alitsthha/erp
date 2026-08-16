import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

interface AttendanceActionsProps {
  recordId: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export default function AttendanceActions({
  recordId,
  onEdit,
  onDelete,
  isLoading,
}: AttendanceActionsProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => onEdit(recordId)}
          disabled={isLoading}
          title="Edit record"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={() => setDeleteConfirm(true)}
          disabled={isLoading}
          title="Delete record"
          className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Delete Attendance Record
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              This will remove this student's attendance entry. Are you sure you want to proceed?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(recordId);
                  setDeleteConfirm(false);
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
