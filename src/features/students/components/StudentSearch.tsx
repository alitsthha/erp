type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

export default function StudentSearch({
  value = "",
  onChange,
}: Props) {
  return (
    <input
      type="text"
      placeholder="Search by name, code, or guardian..."
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="ui-field w-full pl-10 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
    />
  );
}