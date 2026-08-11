import { useNavigate } from "react-router-dom";

import StaffForm from "../forms/StaffForm";
import { addStaff } from "../services/staff.service";
import type { StaffFormData } from "../schemas/staff.schema";

export default function AddStaffPage() {
  const navigate = useNavigate();

  async function handleAdd(data: StaffFormData) {
    try {
      await addStaff(data);

      alert("Staff added successfully.");

      navigate("/staff");
    } catch (error) {
      console.error(error);

      alert("Unable to save staff.");
    }
  }

  return (
    <StaffForm
      onSave={handleAdd}
      submitLabel="Add Staff"
    />
  );
}