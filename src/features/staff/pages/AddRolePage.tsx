import { useNavigate } from "react-router-dom";

import RoleForm from "../forms/RoleForm";
import { addRole } from "../services/role.service";

import type { RoleFormData } from "../schemas/role.schema";

export default function AddRolePage() {
  const navigate = useNavigate();

  async function handleSubmit(data: RoleFormData) {
    try {
      await addRole(data);

      alert("Role created successfully.");

      navigate("/staff/roles");
    } catch (error) {
      console.error(error);
      alert("Failed to create role.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Add Role
      </h1>

      <RoleForm
        onSubmit={handleSubmit}
        submitLabel="Create Role"
      />
    </div>
  );
}