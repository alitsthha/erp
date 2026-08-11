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
  placeholder = "Search by student name, code, or activity...",
}: AttendanceSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
