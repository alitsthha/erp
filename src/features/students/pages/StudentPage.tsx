import { useNavigate } from "react-router-dom";

export default function StudentsPage() {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="ui-page-title">
          Students
        </h1>

        <button
          onClick={() => navigate("/students/new")}
          className="ui-button bg-brand-600 py-3 text-white hover:bg-brand-700"
        >
          + Add Student
        </button>
      </div>

      <div className="ui-surface p-10 text-center text-slate-500">
        No students found.
      </div>
    </div>
  );
}