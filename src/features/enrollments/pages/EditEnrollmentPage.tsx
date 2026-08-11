import { useParams } from "react-router-dom";
import EnrollmentForm from "../forms/EnrollmentForm";

export default function EditEnrollmentPage() {
  const { enrollmentId } = useParams();

  if (!enrollmentId) {
    throw new Error("Enrollment ID is required.");
  }

  return (
    <div className="w-full">
      <EnrollmentForm enrollmentId={enrollmentId} />
    </div>
  );
}