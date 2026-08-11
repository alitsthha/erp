import Select from "@/components/ui/Select";

type FilterStatus = "All" | "Present" | "Absent";

interface AttendanceFiltersProps {
  status: FilterStatus;
  onStatusChange: (status: FilterStatus) => void;
}

export default function AttendanceFilters({
  status,
  onStatusChange,
}: AttendanceFiltersProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="flex-1">
        <Select value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onStatusChange(e.target.value as FilterStatus)}>
          <option value="All">All Status</option>
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
        </Select>
      </div>
    </div>
  );
}
