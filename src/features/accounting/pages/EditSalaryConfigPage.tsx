import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/common/AddPageHeader";
import SalaryConfigForm from "@/features/staff/components/SalaryConfigForm";
import { getSalaryConfigById, updateSalaryConfig } from "@/features/staff/services/salaryConfig.service";
import type { SalaryConfig } from "@/features/staff/types/salaryConfig.types";
import type { SalaryConfigFormData } from "@/features/staff/schemas/salaryConfig.schema";

export default function EditSalaryConfigPage() {
  const { configId } = useParams<{ configId: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<SalaryConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!configId) return;
    void getSalaryConfigById(configId).then(setConfig).finally(() => setLoading(false));
  }, [configId]);

  async function handleSubmit(data: SalaryConfigFormData) {
    if (!configId) return;
    await updateSalaryConfig(configId, data);
    navigate("/accounting/salary-config");
  }

  if (loading) return <div className="flex min-h-96 items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (!config) return <div className="p-8 text-center text-red-600">Salary configuration not found.</div>;

  return <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"><PageHeader title="Edit Salary Configuration" description="Update salary structure for this staff member." /><SalaryConfigForm initialData={config} onSubmit={handleSubmit} submitLabel="Update Configuration" /></div>;
}
