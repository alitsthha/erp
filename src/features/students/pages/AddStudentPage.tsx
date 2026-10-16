import toast from "react-hot-toast";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";

import StudentForm from "../forms/StudentForm";
import { addStudent } from "../services/student.service";
import type { StudentFormData } from "../schemas/student.schema";

export default function AddStudentPage() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-60 items-center justify-center p-8 text-slate-500">
        Loading...
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/students" replace />;
  }

  async function handleSubmit(data: StudentFormData) {
    try {
      await addStudent(data);
      toast.success("Student created successfully.");
      navigate("/students");
    } catch (error) {
      console.error("Failed to add student:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to add student. Please try again.", { cause: error });
    }
  }

  return (
    <StudentForm
      onSubmit={handleSubmit}
      submitLabel="Create Student"
      onCancel={() => navigate("/students")}
    />
  );
}