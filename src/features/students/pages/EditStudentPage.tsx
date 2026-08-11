import { useParams } from "react-router-dom";

import PageHeader from "../../../components/common/AddPageHeader";
import StudentForm from "../forms/StudentForm";

export default function EditStudentPage() {
  const { studentId } = useParams();

  if (!studentId) {
    throw new Error("Student ID is required.");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Edit Student"
        description="Update student details."
      />

      <StudentForm studentId={studentId} />
    </div>
  );
}