import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import RoleForm from "../forms/RoleForm";
import {
  getRoleById,
  updateRole,
} from "../services/role.service";

import type { RoleFormData } from "../schemas/role.schema";

export default function EditRolePage() {
  const { roleId } = useParams();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [initialData, setInitialData] =
    useState<Partial<RoleFormData>>();

  useEffect(() => {
    async function loadRole() {
      if (!roleId) {
        setLoading(false);
        return;
      }

      try {
        const role = await getRoleById(roleId);

        if (!role) {
          alert("Role not found");
          navigate("/staff/roles");
          return;
        }

        setInitialData({
          name: role.name,
          description: role.description,
          color: role.color,
          displayOrder: role.displayOrder,
          status: role.status,
          permissions: role.permissions,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadRole();
  }, [roleId, navigate]);

  async function handleSubmit(
    data: RoleFormData
  ) {
    if (!roleId) return;

    await updateRole(roleId, data);

    alert("Role updated successfully.");

    navigate("/staff/roles");
  }

  if (loading) {
    return (
      <div className="p-8">
        Loading Role...
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="p-8 text-red-600">
        Role not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      <div>
        <h1 className="text-3xl font-bold">
          Edit Role
        </h1>

        <p className="text-gray-500">
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