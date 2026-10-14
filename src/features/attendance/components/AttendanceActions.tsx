import { Pencil, Trash2 } from "lucide-react";

interface AttendanceActionsProps {
  recordId: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  canDelete?: boolean;
}

export default function AttendanceActions({
  recordId,
  onEdit,
  onDelete,
  isLoading,
  canDelete = true,
}: AttendanceActionsProps) {

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
        {canDelete && <button
          type="button"
          onClick={() => onDelete(recordId)}
          disabled={isLoading}
          title="Delete record"
          className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
        >
          <Trash2 size={15} />
        </button>}
      </div>


    </>
  );
}
