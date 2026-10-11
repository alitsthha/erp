import { Search } from "lucide-react";
import Input from "@/components/ui/Input";

interface AttendanceSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function AttendanceSearch({
  value,
  onChange,
  placeholder = "Search students, activities or teachers...",
}: AttendanceSearchProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="text"
        aria-label="Search attendance"
        placeholder={placeholder}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
