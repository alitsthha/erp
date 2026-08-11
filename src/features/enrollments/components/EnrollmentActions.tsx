import {
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

type Props = {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function EnrollmentActions({
  onView,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="flex items-center justify-end gap-2">
      {/* View */}
      <button
        type="button"
        onClick={onView}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
        aria-label="View enrollment"
        title="View"
      >
        <Eye size={16} />
      </button>

      {/* Edit */}
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        aria-label="Edit enrollment"
        title="Edit"
      >
        <Pencil size={16} />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
        aria-label="Delete enrollment"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}