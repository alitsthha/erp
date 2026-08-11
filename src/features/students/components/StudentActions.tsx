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

export default function StudentActions({
  onView,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="flex items-center gap-1">
      {/* View */}
      <button
        type="button"
        onClick={onView}
        aria-label="View student"
        title="View student"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        <Eye size={17} />
      </button>

      {/* Edit */}
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit student"
        title="Edit student"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
      >
        <Pencil size={17} />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete student"
        title="Delete student"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-100"
      >
        <Trash2 size={17} />
      </button>
    </div>
  );
}