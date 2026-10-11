import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { isActivityAllowedForRole } from "@/lib/rbac";
import { getAllEnrollments } from "@/features/enrollments/services/enrollment.service";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import type { Attendance } from "../types/attendance.types";
import { getUnrecordedActivities } from "../utils/attendance-tracking";
import { getBSWeekday } from "@/utils/nepali-date";

export default function AttendanceReminder({ records, todayBS, ready }: { records: Attendance[]; todayBS: string; ready: boolean }) {
  const { role, activityIds } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [dismissedDate, setDismissedDate] = useState("");

  useEffect(() => {
    let cancelled = false;
    getAllEnrollments().then((data) => {
      if (!cancelled) setEnrollments(data);
    }).catch((error) => console.error("Unable to check attendance reminders:", error));
    return () => { cancelled = true; };
  }, [todayBS]);

  const allowedEnrollments = enrollments.filter((item) =>
    isActivityAllowedForRole(role, item.activityName, item.activityCode, activityIds, item.activityId)
  );
  const missing = getUnrecordedActivities(allowedEnrollments, records, todayBS);

  if (!ready || !role || !missing.length || dismissedDate === todayBS) return null;

  return (
    <div role="status" className="relative rounded-xl border border-amber-200 bg-amber-50 p-5 pr-12 text-amber-900">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={18} aria-hidden="true" />
        Attendance not recorded today
      </div>
      <p className="mt-1 text-sm">
        {todayBS} BS · {getBSWeekday(todayBS)}. These activities have no attendance entries yet.
        If classes are running today, remember to mark attendance.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {missing.map((activity) => (
          <Link key={activity.id} to={`/attendance/add?date=${todayBS}&activity=${encodeURIComponent(activity.id)}`}
            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium hover:bg-amber-100">
            {activity.name} · Mark attendance
          </Link>
        ))}
      </div>
      <button type="button" onClick={() => setDismissedDate(todayBS)} aria-label="Dismiss attendance reminder"
        className="absolute right-3 top-3 rounded-lg p-2 hover:bg-amber-100">
        <X size={18} />
      </button>
    </div>
  );
}
