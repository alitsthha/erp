import { useNavigate } from "react-router-dom";

import DepartmentForm from "../forms/DepartmentForm";
import { addDepartment } from "../services/department.service";

export default function AddDepartmentPage() {
  const navigate = useNavigate();

  async function handleSubmit(data: any) {
    await addDepartment(data);
    navigate("/staff/departments");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Add Department
      </h1>

      <DepartmentForm
        onSubmit={handleSubmit}
        submitLabel="Save Department"
      />
    </div>
  );
}