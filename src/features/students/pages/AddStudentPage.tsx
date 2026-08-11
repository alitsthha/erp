import { useNavigate } from "react-router-dom";

import StudentForm from "../forms/StudentForm";

import { addStudent } from "../services/student.service";

import type { StudentFormData } from "../schemas/student.schema";

export default function AddStudentPage() {
  const navigate = useNavigate();

  async function handleSubmit(data: StudentFormData) {
    try {
      console.log("Submitting student:", data);

      await addStudent(data);

      navigate("/students");
    } catch (error) {
      console.error("Failed to add student:", error);

      alert("Failed to add student. Please try again.");
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