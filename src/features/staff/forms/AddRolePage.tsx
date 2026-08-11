import { useNavigate } from "react-router-dom";

import RoleForm from "./RoleForm";
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Add Staff Role
        </h1>

        <p className="mt-2 text-gray-500">
          Create staff roles for your academy.
        </p>
      </div>

      <RoleForm
        onSubmit={handleSubmit}
        submitLabel="Save Role"
      />
    </div>
  );
}