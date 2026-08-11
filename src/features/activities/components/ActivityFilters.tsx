type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

export default function ActivityFilters({
  value = "all",
  onChange,
}: Props) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange?.(e.target.value)
      }
      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
    >
      <option value="all">
        All Activities
      </option>

      <option value="active">
        Active
      </option>

      <option value="inactive">
        Inactive
      </option>
    </select>
  );
}