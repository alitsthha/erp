import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PageHeader from "../../../components/common/AddPageHeader";
import StudentForm from "../forms/StudentForm";
import { getStudentById, updateStudent } from "../services/student.service";
import type { StudentFormData } from "../schemas/student.schema";
import type { Student } from "../types/student.types";

export default function EditStudentPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const studentIdValue = studentId ?? "";

  if (!studentIdValue) {
    throw new Error("Student ID is required.");
  }

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true);
        const result = await getStudentById(studentIdValue);
        setStudent(result);
      } catch (error) {
        console.error("Failed to load student:", error);
        setStudent(null);
      } finally {
        setLoading(false);
      }
    }

    void loadStudent();
  }, [studentIdValue]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-sm text-slate-500">
        Loading student details...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-sm text-red-600">
        Student not found.
      </div>
    );
  }

  async function handleSubmit(data: StudentFormData) {
    try {
      await updateStudent(studentIdValue, data);
      navigate("/students");
    } catch (error) {
      console.error("Failed to update student:", error);
      alert("Failed to update student. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Edit Student"
        description="Update student details."
      />

      <StudentForm
        initialData={{
          fullName: student.fullName,
          guardianName: student.guardianName ?? student.parentName ?? "",
          guardianPhone: student.guardianPhone ?? student.parentPhone ?? "",
          guardianEmail: student.guardianEmail ?? student.parentEmail ?? "",
          parentName: student.parentName ?? "",
          parentPhone: student.parentPhone ?? "",
          parentEmail: student.parentEmail ?? "",
          studentEmail: student.studentEmail ?? "",
          gender: student.gender ?? "Male",
          dateOfBirth: student.dateOfBirth ?? "",
          admissionDate: student.admissionDate ?? "",
          status: student.status,
          address: student.address ?? "",
          joiningDateBS: student.joiningDateBS ?? "",
          note: student.note ?? "",
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/students")}
        submitLabel="Update Student"
      />
    </div>
  );
}