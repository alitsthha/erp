type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

export default function StudentFilters({
  value = "all",
  onChange,
}: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    >
      <option value="all">All Students</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  );
}