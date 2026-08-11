import { useNavigate } from "react-router-dom";

export default function StudentsPage() {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">
          Students
        </h1>

        <button
          onClick={() => navigate("/students/new")}
          className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
        >
          + Add Student
        </button>
      </div>

      <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
        No students found.
      </div>
    </div>
  );
}