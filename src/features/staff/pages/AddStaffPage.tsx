import { useNavigate } from "react-router-dom";

import StaffForm from "../forms/StaffForm";
import { addStaff } from "../services/staff.service";
import type { StaffFormData } from "../schemas/staff.schema";

export default function AddStaffPage() {
  const navigate = useNavigate();

  async function handleAdd(data: StaffFormData) {
    try {
      await addStaff(data);
      navigate("/staff", { replace: true });
    } catch (error) {
      console.error(error);
      alert("Unable to save staff.");
    }
  }

  return (
    <div className="min-h-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <StaffForm
        onSave={handleAdd}
        submitLabel="Add Staff"
        onCancel={() => navigate("/staff")}
      />
    </div>
  );
}