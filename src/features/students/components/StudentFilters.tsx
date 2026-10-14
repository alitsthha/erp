import SearchableSelect from "@/components/forms/SearchableSelect";
type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

export default function StudentFilters({
  value = "all",
  onChange,
}: Props) {
  return (
    <SearchableSelect
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="ui-field w-full px-4 text-slate-700 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
    >
      <option value="all">All Students</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </SearchableSelect>
  );
}