import { useNavigate } from "react-router-dom";

import SalaryConfigForm from "../components/SalaryConfigForm";

import { addSalaryConfig } from "../services/salaryConfig.service";

import type { SalaryConfigFormData } from "../schemas/salaryConfig.schema";

export default function AddSalaryConfigPage() {
  const navigate = useNavigate();

  async function handleSave(
    data: SalaryConfigFormData
  ): Promise<void> {
    await addSalaryConfig(data);

    alert("Salary configuration added successfully.");

    navigate("/staff/salary-config");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Add Salary Configuration
      </h1>

      <SalaryConfigForm
        onSubmit={handleSave}
      />
    </div>
  );
}