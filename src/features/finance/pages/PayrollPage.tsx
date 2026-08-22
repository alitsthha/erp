import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Briefcase, Check, FileText, Loader2, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStaff } from "@/features/staff/services/staff.service";
import { getSalaryConfigs } from "@/features/staff/services/salaryConfig.service";
import type { Staff } from "@/features/staff/types/staff.types";
import type { SalaryConfig } from "@/features/staff/types/salaryConfig.types";
import { getCurrentBSDate, formatBSDate } from "@/utils/nepali-date";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";
import type { PayrollRun, Payslip } from "@/features/accounting/types/operational.types";
import { createPayrollRun, disbursePayrollRun, getPayrollRuns } from "@/features/accounting/services/operational.service";

function money(value: number) { return `Rs. ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`; }

export default function PayrollPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [paymentDate, setPaymentDate] = useState(getCurrentBSDate());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedSlip, setSelectedSlip] = useState<Payslip | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [staffList, configList, runList] = await Promise.all([getStaff(), getSalaryConfigs(), getPayrollRuns()]);
      setStaff(staffList.filter((item) => item.status !== "Inactive"));
      setConfigs(configList.filter((item) => item.status === "Active"));
      setRuns(runList);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const period = paymentDate.slice(0, 7);
  const payslips = useMemo<Payslip[]>(() => staff.map((member) => {
    const config = configs.find((item) => item.staffId === member.id)
      ?? configs.find((item) => !item.staffId && item.role === member.designation)
      ?? configs[0];
    const basicSalary = Number(config?.basicSalary ?? 0);
    const allowance = Number(config?.allowance ?? 0) + Number(config?.bonus ?? 0);
    const deduction = Number(config?.deduction ?? 0);
    const tax = Number(config?.tax ?? 0);
    return { staffId: member.id, staffName: member.fullName, staffCode: member.staffCode, period, basicSalary, allowance, deduction, tax, netPay: Math.max(0, basicSalary + allowance - deduction - tax) };
  }), [configs, period, staff]);
  const totals = payslips.reduce((result, slip) => ({ gross: result.gross + slip.basicSalary + slip.allowance, deductions: result.deductions + slip.deduction + slip.tax, net: result.net + slip.netPay }), { gross: 0, deductions: 0, net: 0 });

  async function generateRun() {
    try { await createPayrollRun({ period, paymentDate, staffCount: payslips.length, grossAmount: totals.gross, deductions: totals.deductions, netAmount: totals.net, status: "Draft", payslips }); setMessage("Payroll run generated."); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to generate payroll run."); }
  }

  async function disburse(run: PayrollRun) {
    try { await disbursePayrollRun(run.id || ""); setMessage(`${run.period} payroll disbursed.`); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to disburse payroll."); }
  }

  return <div className="min-h-full bg-slate-50"><div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><button type="button" onClick={() => navigate("/finance")} className="mb-3 inline-flex items-center gap-2 text-sm text-slate-600"><ArrowLeft size={16} /> Back to Finance</button><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Payroll Disbursement</h1><p className="mt-1 text-sm text-slate-500">Generate, approve, disburse, and print staff payslips.</p></div><button type="button" onClick={() => navigate("/accounting/salary-config")} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"><Briefcase size={16} /> Salary Config</button></div>
    {message && <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}
    {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div> : <>
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-3"><NepaliDatePickerInput label="Payroll Date (BS)" value={paymentDate} onChange={setPaymentDate} helperText={`Payroll period: ${period}`} /><div className="flex items-end"><button type="button" onClick={() => void generateRun()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"><FileText size={16} /> Generate Payroll Run</button></div></div></section>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">{[["Gross", totals.gross], ["Deductions", totals.deductions], ["Net Disbursement", totals.net]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{money(Number(value))}</p></div>)}</div>
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-semibold">Current Payslips</h2><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-3">Staff</th><th className="px-3 py-3">Gross</th><th className="px-3 py-3">Deductions</th><th className="px-3 py-3">Net Pay</th><th className="px-3 py-3 text-right">Action</th></tr></thead><tbody>{payslips.map((slip) => <tr key={slip.staffId} className="border-t border-slate-100"><td className="px-3 py-3">{slip.staffName}<span className="ml-2 text-xs text-slate-400">{slip.staffCode}</span></td><td className="px-3 py-3">{money(slip.basicSalary + slip.allowance)}</td><td className="px-3 py-3">{money(slip.deduction + slip.tax)}</td><td className="px-3 py-3 font-semibold">{money(slip.netPay)}</td><td className="px-3 py-3 text-right"><button type="button" onClick={() => { setSelectedSlip(slip); window.setTimeout(() => window.print(), 100); }} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs"><Printer size={14} /> Payslip</button></td></tr>)}</tbody></table></div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-semibold">Payroll Runs</h2>{runs.map((run) => <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm"><span>{run.period} · {formatBSDate(run.paymentDate)} · {money(run.netAmount)}</span>{run.status === "Disbursed" ? <span className="inline-flex items-center gap-1 text-emerald-600"><Check size={15} /> Disbursed</span> : <button type="button" onClick={() => void disburse(run)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">Disburse</button>}</div>)}</section>
    </>}
    {selectedSlip && <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-8 print:static print:block"><div className="w-full max-w-lg border border-slate-300 bg-white p-8 print:max-w-none print:border-0"><h2 className="text-2xl font-bold">Salary Payslip</h2><p className="mt-1 text-sm text-slate-500">{selectedSlip.period} · {formatBSDate(paymentDate)}</p><div className="mt-6 space-y-2 text-sm"><p><strong>Staff:</strong> {selectedSlip.staffName} ({selectedSlip.staffCode})</p><p><strong>Basic Salary:</strong> {money(selectedSlip.basicSalary)}</p><p><strong>Allowance:</strong> {money(selectedSlip.allowance)}</p><p><strong>Deduction:</strong> {money(selectedSlip.deduction)}</p><p><strong>Tax:</strong> {money(selectedSlip.tax)}</p><p className="border-t pt-3 text-lg"><strong>Net Pay:</strong> {money(selectedSlip.netPay)}</p></div><button type="button" onClick={() => setSelectedSlip(null)} className="mt-6 rounded-lg border px-3 py-2 text-sm print:hidden">Close</button></div></div>}
  </div></div>;
}
