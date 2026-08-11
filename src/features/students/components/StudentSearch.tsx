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
      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
  );
}