import SearchableSelect from "@/components/forms/SearchableSelect";
type DashboardFiltersProps = {
  value?: string;
  onChange?: (value: string) => void;
};

export default function DashboardFilters({
  value = "all",
  onChange,
}: DashboardFiltersProps) {
  return (
    <SearchableSelect
      value={value}
      onChange={(event) =>
        onChange?.(event.target.value)
      }
      className="ui-field w-full px-4 text-slate-700 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100 md:w-56"
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
    </SearchableSelect>
  );
}