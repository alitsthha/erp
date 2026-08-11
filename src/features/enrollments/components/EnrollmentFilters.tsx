import { SlidersHorizontal } from "lucide-react";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

export default function EnrollmentFilters({
  value = "all",
  onChange,
}: Props) {
  return (
    <div className="relative w-full md:w-44">
      <SlidersHorizontal
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <select
        value={value}
        onChange={(event) =>
          onChange?.(event.target.value)
        }
        className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="all">All Enrollments</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}