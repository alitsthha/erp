import { Search } from "lucide-react";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

export default function EnrollmentSearch({
  value = "",
  onChange,
}: Props) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        size={17}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange?.(event.target.value)
        }
        placeholder="Search enrollment, student, activity..."
        className="ui-field w-full pl-10 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}