import { Search } from "lucide-react";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

export default function ActivitySearch({
  value = "",
  onChange,
}: Props) {
  return (
    <div className="relative w-full">
      <Search
        size={17}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        type="text"
        placeholder="Search by activity, code or coach..."
        value={value}
        onChange={(e) =>
          onChange?.(e.target.value)
        }
        className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
      />
    </div>
  );
}