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
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(recordId)}
          disabled={isLoading}
          className="rounded border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => setDeleteConfirm(true)}
          disabled={isLoading}
          className="rounded border border-slate-300 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">
              Delete Attendance Record
            </h3>
            <p className="mt-2 text-slate-600">
              This action cannot be undone. Are you sure you want to delete this attendance record?
            </p>
            <div className="mt-4 flex gap-4">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(recordId);
                  setDeleteConfirm(false);
                }}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
