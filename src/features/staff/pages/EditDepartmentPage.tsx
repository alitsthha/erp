import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DepartmentForm from "../forms/DepartmentForm";

import {
  getDepartmentById,
  updateDepartment,
} from "../services/department.service";

import type { Department } from "../types/department.types";

export default function EditDepartmentPage() {
  const { departmentId } = useParams();

  const navigate = useNavigate();

  const [department, setDepartment] =
    useState<Department | null>(null);

  useEffect(() => {
    async function loadDepartment() {
      if (!departmentId) return;

      const data = await getDepartmentById(departmentId);

      if (data) {
        setDepartment(data);
      }
    }

    loadDepartment();
  }, [departmentId]);

  async function handleSubmit(data: any) {
    if (!departmentId) return;

    await updateDepartment(departmentId, data);

    navigate("/staff/departments");
  }

  if (!department) {
    return (
      <div className="p-6">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Edit Department
      </h1>

      <DepartmentForm
        initialData={department}
        onSubmit={handleSubmit}
        submitLabel="Update Department"
      />
    </div>
  );
}