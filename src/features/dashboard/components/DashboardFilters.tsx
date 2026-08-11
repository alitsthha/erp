type DashboardFiltersProps = {
  value?: string;
  onChange?: (value: string) => void;
};

export default function DashboardFilters({
  value = "all",
  onChange,
}: DashboardFiltersProps) {
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange?.(event.target.value)
      }
      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-56"
    >
      <option value="all">
        All Students
      </option>

      <option value="active">
        Active Students
      </option>

      <option value="inactive">
        Inactive Students
      </option>
    </select>
  );
}