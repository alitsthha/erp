import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import SalaryConfigForm from "../components/SalaryConfigForm";

import {
  getSalaryConfigById,
  updateSalaryConfig,
} from "../services/salaryConfig.service";

import type { SalaryConfig } from "../types/salaryConfig.types";
import type { SalaryConfigFormData } from "../schemas/salaryConfig.schema";

export default function EditSalaryConfigPage() {
  const { salaryId } = useParams();

  const navigate = useNavigate();

  const [salary, setSalary] = useState<SalaryConfig | null>(null);

  useEffect(() => {
    async function load() {
      if (!salaryId) return;

      const data = await getSalaryConfigById(salaryId);

      if (data) {
        setSalary(data);
      }
    }

    load();
  }, [salaryId]);

  async function handleUpdate(
    data: SalaryConfigFormData
  ): Promise<void> {
    if (!salaryId) return;

    await updateSalaryConfig(salaryId, data);

    alert("Salary configuration updated.");

    navigate("/staff/salary-config");
  }

  if (!salary) {
    return <p>Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Edit Salary Configuration
      </h1>

      <SalaryConfigForm
        initialData={salary}
        onSubmit={handleUpdate}
        submitLabel="Update Configuration"
      />
    </div>
  );
}