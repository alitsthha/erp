import type { Attendance } from "../types/attendance.types";
import { attendanceActorName } from "../utils/attendance-recorder";

export default function AttendanceRecorderDetails({ records }: { records: Attendance[] }) {
  return <div className="min-w-28 space-y-3 text-xs">
    {records.map((record, index) => {
      const original = attendanceActorName(record, "recorded");
      const latest = attendanceActorName(record, "updated");
      return <div key={record.id || index} className="space-y-1">
        {records.length > 1 && <p className="text-slate-400">{record.activityName || "Activity"}</p>}
        <p className={original || latest ? "font-medium text-slate-700" : "text-slate-400"}>
          {original || latest || "Not recorded"}
        </p>
        {latest && <p className="text-slate-500">Last saved by {latest}</p>}
      </div>;
    })}
  </div>;
}
