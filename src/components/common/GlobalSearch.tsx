import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { getStudents } from "@/features/students/services/student.service";
import { getAllEnrollments } from "@/features/enrollments/services/enrollment.service";
import { isActivityAllowedForRole } from "@/lib/rbac";
import type { Student } from "@/features/students/types/student.types";
import StudentQuickActions from "./StudentQuickActions";

export default function GlobalSearch() {
  const { role, activityIds, permissions, isAdmin } = useAuth();
  const [term, setTerm] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const canSearch = isAdmin || permissions.students;
  useEffect(() => {
    if (!open || !canSearch) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [studentList, enrollments] = await Promise.all([getStudents(), isAdmin ? Promise.resolve([]) : getAllEnrollments()]);
        const allowed = new Set(enrollments.filter((item) => isActivityAllowedForRole(role, item.activityName, item.activityCode, activityIds, item.activityId)).map((item) => item.studentId));
        if (!cancelled) setStudents(isAdmin ? studentList : studentList.filter((item) => allowed.has(item.id)));
      } catch { if (!cancelled) setError("Search unavailable. Try opening search again."); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, canSearch, isAdmin, role, activityIds]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  if (!canSearch) return null;
  const query = term.trim().toLowerCase();
  const matches = students.filter((student) => [student.id, student.studentCode, student.fullName, student.guardianPhone, student.parentPhone].some((value) => value?.toLowerCase().includes(query)));
  return <div ref={container} className="relative w-40 sm:w-64 lg:w-80" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <Search size={18} className="shrink-0 text-slate-400" />
      <input aria-label="Search students by ID, name, or guardian phone" aria-expanded={open} aria-controls="global-search-results" value={term} onFocus={() => setOpen(true)} onChange={(event) => { setTerm(event.target.value); setOpen(true); }} placeholder="ID, name, phone…" className="min-w-0 w-full bg-transparent text-sm outline-none" />
    </label>
    {open && <div id="global-search-results" className="absolute right-0 z-50 mt-2 max-h-[70vh] w-[min(90vw,28rem)] overflow-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <button type="button" onClick={() => setOpen(false)} className="mb-2 text-xs text-slate-500">Close search</button>
      {loading ? <p role="status">Loading students…</p> : error ? <p role="alert">{error}</p> : !query ? <p className="text-sm text-slate-500">Enter a student ID, name, or guardian phone.</p> : <>
        <p className="text-xs text-slate-500">{matches.length} matches{matches.length > 20 ? " · showing first 20; narrow your search" : ""}</p>
        {matches.slice(0, 20).map((student) => <div key={student.id} className="space-y-2 border-b border-slate-100 py-3">
          <Link onClick={() => { setOpen(false); setTerm(""); }} className="font-medium text-brand-700" to={`/students/profile/${student.id}`}>{student.studentCode} · {student.fullName}</Link>
          <p className="text-xs text-slate-500">{student.guardianPhone ?? student.parentPhone}</p>
          <div onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}><StudentQuickActions studentId={student.id} /></div>
        </div>)}
      </>}
    </div>}
  </div>;
}
