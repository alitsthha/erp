import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";

export default function StudentQuickActions({ studentId }: { studentId: string }) {
  const { isAdmin, permissions } = useAuth();
  const query = new URLSearchParams({ studentId }).toString();
  const style = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50";
  return <div className="flex flex-wrap gap-2">
    {permissions.attendance && <Link className={style} to={`/attendance/add?${query}`}>Record attendance</Link>}
    {isAdmin && <>
      <Link className={style} to={`/finance/billing?${query}`}>Create bill</Link>
      <Link className={style} to={`/finance/billing?${query}&action=payment`}>Record payment</Link>
      <Link className={style} to={`/enrollments?${query}`}>View enrollments</Link>
      <Link className={style} to={`/enrollments/add?${query}`}>Enroll student</Link>
    </>}
  </div>;
}
