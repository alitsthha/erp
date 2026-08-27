import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Briefcase, CalendarCheck, Check, Clock3, Download, FileText, Loader2, Users } from "lucide-react";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import { getStaff } from "@/features/staff/services/staff.service";
import { getAttendanceHours, getStaffAttendanceByPeriod, saveStaffAttendance } from "@/features/staff/services/staff-attendance.service";
import { getActivities } from "@/features/activities/services/activity.service";
import { getAllAttendances } from "@/features/attendance/services/attendance.service";
import { getSalaryConfigs } from "@/features/staff/services/salaryConfig.service";
import type { Staff } from "@/features/staff/types/staff.types";
import type { SalaryConfig } from "@/features/staff/types/salaryConfig.types";
import { getCurrentBSDate, formatBSDate } from "@/utils/nepali-date";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";
import type { PayrollRun, Payslip } from "@/features/accounting/types/operational.types";
import { createPayrollRun, disbursePayrollRun, getPayrollRuns } from "@/features/accounting/services/operational.service";
import { calculateAttendancePay, summarizeStaffAttendance } from "@/features/accounting/services/payroll-calculator.service";

function money(value: number) { return `Rs. ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`; }

function calculateHours(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const [inHour, inMinute] = checkIn.split(":").map(Number);
  const [outHour, outMinute] = checkOut.split(":").map(Number);
  const minutes = outHour * 60 + outMinute - (inHour * 60 + inMinute);
  return minutes > 0 ? Number((minutes / 60).toFixed(2)) : 0;
}

export default function PayrollPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [paymentDate, setPaymentDate] = useState(getCurrentBSDate());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [staffAttendance, setStaffAttendance] = useState<Awaited<ReturnType<typeof getStaffAttendanceByPeriod>>>([]);
  const [activities, setActivities] = useState<Awaited<ReturnType<typeof getActivities>>>([]);
  const [classAttendance, setClassAttendance] = useState<Awaited<ReturnType<typeof getAllAttendances>>>([]);
  const [attendanceForm, setAttendanceForm] = useState({ staffId: "", dateBS: getCurrentBSDate(), status: "Present", checkIn: "", checkOut: "" });

  async function load() {
    setLoading(true);
    try {
      const [staffList, configList, runList, staffAttendanceList, activityList, classAttendanceList] = await Promise.all([
        getStaff(), getSalaryConfigs(), getPayrollRuns(), getStaffAttendanceByPeriod(period), getActivities(), getAllAttendances(),
      ]);
      setStaff(staffList.filter((item) => item.status !== "Inactive"));
      setConfigs(configList.filter((item) => item.status === "Active"));
      setRuns(runList);
      setStaffAttendance(staffAttendanceList);
      setActivities(activityList);
      setClassAttendance(classAttendanceList);
    } finally { setLoading(false); }
  }

  const period = paymentDate.slice(0, 7);
  useEffect(() => { void load(); }, [period]);
  const enteredHours = calculateHours(attendanceForm.checkIn, attendanceForm.checkOut);
  const attendanceTotals = useMemo(() => ({
    present: staffAttendance.filter((item) => item.status === "Present").length,
    absent: staffAttendance.filter((item) => item.status === "Absent").length,
    leave: staffAttendance.filter((item) => item.status === "Leave").length,
    hours: staffAttendance.reduce((total, item) => total + getAttendanceHours(item), 0),
  }), [staffAttendance]);
  const payslips = useMemo<Payslip[]>(() => staff.map((member) => {
    const config = configs.find((item) => item.staffId === member.id)
      ?? configs.find((item) => !item.staffId && item.role === member.designation)
      ?? configs[0];
    const summary = config ? summarizeStaffAttendance(member.id, staffAttendance, activities, classAttendance) : { presentDays: 0, workingDays: 0, hoursWorked: 0, classesCompleted: 0 };
    const basicSalary = Number(config?.basicSalary ?? 0);
    const allowance = Number(config?.allowance ?? 0) + Number(config?.bonus ?? 0);
    const deduction = Number(config?.deduction ?? 0);
    const tax = Number(config?.tax ?? 0);
    const netPay = config ? calculateAttendancePay(config, summary) : 0;
    const grossPay = netPay + deduction + tax;
    return { staffId: member.id, staffName: member.fullName, staffCode: member.staffCode, period, basicSalary, allowance, deduction, tax, ...summary, grossPay, netPay };
  }), [activities, classAttendance, configs, period, staff, staffAttendance]);
  const totals = payslips.reduce((result, slip) => ({ gross: result.gross + (slip.grossPay ?? 0), deductions: result.deductions + slip.deduction + slip.tax, net: result.net + slip.netPay }), { gross: 0, deductions: 0, net: 0 });

  async function generateRun() {
    try { await createPayrollRun({ period, paymentDate, staffCount: payslips.length, grossAmount: totals.gross, deductions: totals.deductions, netAmount: totals.net, status: "Draft", payslips }); setMessage("Payroll run generated."); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to generate payroll run."); }
  }

  async function disburse(run: PayrollRun) {
    try { await disbursePayrollRun(run.id || ""); setMessage(`${run.period} payroll disbursed.`); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to disburse payroll."); }
  }

  async function saveAttendance() {
    const member = staff.find((item) => item.id === attendanceForm.staffId);
    if (!member) {
      setMessage("Select a staff member before saving attendance.");
      return;
    }
    if (!attendanceForm.dateBS) {
      setMessage("Select an attendance date before saving.");
      return;
    }
    if (attendanceForm.status === "Present" && attendanceForm.checkIn && attendanceForm.checkOut && enteredHours === 0) {
      setMessage("Check-out must be later than check-in.");
      return;
    }
    try {
      await saveStaffAttendance({
        staffId: member.id,
        staffName: member.fullName,
        dateBS: attendanceForm.dateBS,
        status: attendanceForm.status as "Present" | "Absent" | "Leave",
        checkIn: attendanceForm.checkIn || undefined,
        checkOut: attendanceForm.checkOut || undefined,
      });
      setMessage(`Attendance saved for ${member.fullName}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save staff attendance.");
    }
  }

  function downloadPayslip(slip: Payslip) {
    const pdf = new jsPDF();
    const left = 20;
    const right = 190;
    let y = 24;

    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, 210, 34, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("SALARY PAYSLIP", left, y);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Payroll period: ${slip.period}`, right, y, { align: "right" });

    y = 52;
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Employee details", left, y);
    y += 10;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Name: ${slip.staffName}`, left, y);
    pdf.text(`Staff code: ${slip.staffCode || "-"}`, right, y, { align: "right" });

    y += 18;
    pdf.setFillColor(241, 245, 249);
    pdf.rect(left, y - 7, right - left, 10, "F");
    pdf.setFont("helvetica", "bold");
    pdf.text("Earnings", left + 4, y);
    pdf.text("Amount", right - 4, y, { align: "right" });
    y += 12;
    pdf.setFont("helvetica", "normal");
    const rows = [
      ["Basic salary", slip.basicSalary],
      ["Allowance", slip.allowance],
      ["Deduction", -slip.deduction],
      ["Tax", -slip.tax],
    ] as const;
    rows.forEach(([label, amount]) => {
      pdf.text(label, left + 4, y);
      pdf.text(money(amount), right - 4, y, { align: "right" });
      y += 9;
    });
    pdf.setDrawColor(203, 213, 225);
    pdf.line(left, y - 3, right, y - 3);
    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("Net pay", left + 4, y);
    pdf.text(money(slip.netPay), right - 4, y, { align: "right" });
    y += 24;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Generated on ${formatBSDate(paymentDate)}`, left, y);
    pdf.save(`payslip-${slip.staffCode || slip.staffName}-${slip.period}.pdf`);
  }

  return <div className="min-h-full bg-slate-50"><div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><button type="button" onClick={() => navigate("/finance")} className="mb-3 inline-flex items-center gap-2 text-sm text-slate-600"><ArrowLeft size={16} /> Back to Finance</button><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Payroll Disbursement</h1><p className="mt-1 text-sm text-slate-500">Generate, approve, disburse, and print staff payslips.</p></div><button type="button" onClick={() => navigate("/accounting/salary-config")} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"><Briefcase size={16} /> Salary Config</button></div>
    {message && <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}
    {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div> : <>
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-3"><NepaliDatePickerInput label="Payroll Date (BS)" value={paymentDate} onChange={setPaymentDate} helperText={`Payroll period: ${period}`} /><div className="flex items-end"><button type="button" onClick={() => void generateRun()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"><FileText size={16} /> Generate Payroll Run</button></div></div></section>
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-semibold">Staff Attendance</h2><p className="mt-1 text-sm text-slate-500">Save one record per staff member and date. Hours update automatically from the time fields.</p></div><div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_0.8fr_1fr_1fr_auto] lg:items-end"><label className="text-sm font-medium text-slate-700">Staff<select value={attendanceForm.staffId} onChange={(event) => setAttendanceForm((current) => ({ ...current, staffId: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Select staff</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></label><NepaliDatePickerInput label="Date (BS)" value={attendanceForm.dateBS} onChange={(value) => setAttendanceForm((current) => ({ ...current, dateBS: value }))} /><label className="text-sm font-medium text-slate-700">Status<select value={attendanceForm.status} onChange={(event) => setAttendanceForm((current) => ({ ...current, status: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option>Present</option><option>Absent</option><option>Leave</option></select></label><label className="text-sm font-medium text-slate-700">Check in<input type="time" value={attendanceForm.checkIn} onChange={(event) => setAttendanceForm((current) => ({ ...current, checkIn: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><label className="text-sm font-medium text-slate-700">Check out<input type="time" value={attendanceForm.checkOut} onChange={(event) => setAttendanceForm((current) => ({ ...current, checkOut: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><button type="button" onClick={() => void saveAttendance()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Save</button></div><div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"><Clock3 size={16} className="text-blue-600" />Calculated hours: <strong className="text-slate-900">{enteredHours.toFixed(2)} hrs</strong>{attendanceForm.status !== "Present" && <span className="text-slate-400">(hours apply to Present only)</span>}</div></section>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-sm text-slate-500"><CalendarCheck size={16} />Present</p><p className="mt-2 text-xl font-bold">{attendanceTotals.present}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-sm text-slate-500"><Users size={16} />Absent / Leave</p><p className="mt-2 text-xl font-bold">{attendanceTotals.absent + attendanceTotals.leave}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-sm text-slate-500"><Clock3 size={16} />Hours worked</p><p className="mt-2 text-xl font-bold">{attendanceTotals.hours.toFixed(2)}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Period</p><p className="mt-2 text-xl font-bold">{period}</p></div></div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">{[["Gross", totals.gross], ["Deductions", totals.deductions], ["Net Disbursement", totals.net]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{money(Number(value))}</p></div>)}</div>
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-semibold">Current Payslips</h2><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-3">Staff</th><th className="px-3 py-3">Attendance basis</th><th className="px-3 py-3">Gross</th><th className="px-3 py-3">Deductions</th><th className="px-3 py-3">Net Pay</th><th className="px-3 py-3 text-right">Action</th></tr></thead><tbody>{payslips.map((slip) => { const config = configs.find((item) => item.staffId === slip.staffId) ?? configs.find((item) => !item.staffId && item.role === staff.find((member) => member.id === slip.staffId)?.designation) ?? configs[0]; const basis = config?.salaryType === "Hourly" ? `${slip.hoursWorked ?? 0} hours × ${money(slip.basicSalary)}` : config?.salaryType === "Per Class" ? `${slip.classesCompleted ?? 0} sessions × ${money(slip.basicSalary)}` : `${slip.presentDays ?? 0}/${config?.expectedWorkingDays ?? 26} days`; return <tr key={slip.staffId} className="border-t border-slate-100"><td className="px-3 py-3">{slip.staffName}<span className="ml-2 text-xs text-slate-400">{slip.staffCode}</span></td><td className="px-3 py-3 text-xs text-slate-600">{basis}</td><td className="px-3 py-3">{money(slip.grossPay ?? 0)}</td><td className="px-3 py-3">{money(slip.deduction + slip.tax)}</td><td className="px-3 py-3 font-semibold">{money(slip.netPay)}</td><td className="px-3 py-3 text-right"><button type="button" onClick={() => downloadPayslip(slip)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs"><Download size={14} /> PDF</button></td></tr>; })}</tbody></table></div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-semibold">Payroll Runs</h2>{runs.map((run) => <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm"><span>{run.period} · {formatBSDate(run.paymentDate)} · {money(run.netAmount)}</span>{run.status === "Disbursed" ? <span className="inline-flex items-center gap-1 text-emerald-600"><Check size={15} /> Disbursed</span> : <button type="button" onClick={() => void disburse(run)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">Disburse</button>}</div>)}</section>
    </>}
  </div></div>;
}
