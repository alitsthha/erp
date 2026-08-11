import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import RoleForm from "../forms/RoleForm";
import {
  getRoleById,
  updateRole,
} from "../services/role.service";

import type { RoleFormData } from "../schemas/role.schema";

export default function EditRolePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [initialData, setInitialData] =
    useState<Partial<RoleFormData>>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;

      const role = await getRoleById(id);

      if (!role) {
        alert("Role not found");

        navigate("/staff/roles");

        return;
      }

  setInitialData({
  roleCode: role.roleCode,
  name: role.name,
  description: role.description,
  department: role.department,
  color: role.color,
  displayOrder: role.displayOrder,
  staffCount: role.staffCount,
  status: role.status,
  permissions: role.permissions,
});
      setLoading(false);
    }

    load();
  }, [id, navigate]);

  async function handleSubmit(data: RoleFormData) {
    if (!id) return;

    await updateRole(id, data);

    alert("Role updated successfully.");

    navigate("/staff/roles");
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Edit Role
        </h1>

        <p className="mt-2 text-gray-500">
          Update role information.
        </p>
      </div>

      <RoleForm
        initialData={initialData}
        onSubmit={handleSubmit}
        submitLabel="Update Role"
      />
    </div>
  );
}