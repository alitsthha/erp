import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PageHeader from "../../../components/common/AddPageHeader";
import { getStudentById } from "../services/student-update.service";
import type { Student } from "../types/student.types";

export default function StudentProfilePage() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (!studentId) {
      return;
    }

    const loadStudent = async () => {
      const found = await getStudentById(studentId);
      setStudent(found);
    };

    void loadStudent();
  }, [studentId]);

  if (!studentId) {
    throw new Error("Student ID is required.");
  }

  if (!student) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Student Profile" />
        <p className="text-slate-500">Loading student...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={student.fullName}
        description={student.studentCode}
      />

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <p><strong>Guardian:</strong> {student.guardianName ?? student.parentName ?? "-"}</p>
          <p><strong>Phone:</strong> {student.guardianPhone ?? student.parentPhone ?? "-"}</p>
          <p><strong>Email:</strong> {student.guardianEmail ?? student.parentEmail ?? student.studentEmail ?? "-"}</p>
          <p><strong>Status:</strong> {student.status}</p>
          <p className="md:col-span-2"><strong>Address:</strong> {student.address}</p>
        </div>

        <button
          onClick={() => navigate(`/students/edit/${student.id}`)}
          className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Edit Student
        </button>
      </div>
    </div>
  );
}