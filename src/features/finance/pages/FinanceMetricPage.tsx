import { useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import PaginatedList from "@/components/common/PaginatedList";
import ListToolbar from "@/components/common/ListToolbar";
import BSMonthSelect from "../components/BSMonthSelect";
import { getCurrentBSDate } from "@/utils/nepali-date";
import ActivityMultiSelect from "../components/ActivityMultiSelect";
import { useFinanceOverview } from "../hooks/useFinanceOverview";
import { financeDetailRows, filterFinanceDetailRows, filterFinanceOverviewPeriod, type FinanceMetric } from "../services/finance-overview.service";

const metrics: Record<FinanceMetric, { title: string; description: string }> = {
  income: { title: "Total Income", description: "Recorded income, including student payments and advances." },
  expenses: { title: "Total Expenses", description: "Recorded operating expenses." },
  "net-profit": { title: "Net Profit", description: "Recorded income minus recorded expenses. Expenses appear as negative amounts." },
  outstanding: { title: "Outstanding", description: "Current unpaid invoice balances. Payments and discounts are shared proportionally across each invoice’s activities." },
  cash: { title: "Cash Balance", description: "Recorded cash receipts supporting the overview total. This figure does not subtract operating expenses or include opening balances." },
  bank: { title: "Bank Balance", description: "Recorded bank, online and card receipts supporting the overview total. This figure does not subtract operating expenses or include opening balances." },
  "expected-income": { title: "Expected Income", description: "Monthly income from current active students and enrollments. Session fees use recorded Present attendance when that activity has data for the month; otherwise the planned session count is used. Flat monthly fees stay fixed. Amounts are before discounts, advances and payments." },
};
const currency = (value: number) => `Rs. ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function FinanceMetricPage() {
  const { metric } = useParams();
  if (!metric || !Object.hasOwn(metrics, metric)) return <Navigate to="/finance" replace />;
  return <FinanceMetricWorkspace key={metric} metric={metric as FinanceMetric} />;
}

function FinanceMetricWorkspace({ metric }: { metric: FinanceMetric }) {
  const { data, loading, error } = useFinanceOverview();
  const [params] = useSearchParams();
  const requestedMonth = params.get("month") ?? "";
  const [month, setMonth] = useState(/^(20[7-9]\d|2100)-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : getCurrentBSDate().slice(0, 7));
  const [activityIds, setActivityIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const supportsActivities = metric === "outstanding" || metric === "expected-income";
  const rows = useMemo(() => data ? financeDetailRows(params.get("period") === "monthly" ? filterFinanceOverviewPeriod(data, "monthly", month) : data, metric, month) : [], [data, metric, month, params]);
  const filteredRows = useMemo(() => filterFinanceDetailRows(rows, activityIds, search), [rows, activityIds, search]);
  const options = useMemo(() => {
    const choices = new Map((data?.activities ?? []).filter((activity) => !activity.deletedAt)
      .map((activity) => [activity.id, String(activity.activityName || activity.id)]));
    for (const row of rows) if (row.activityId) choices.set(row.activityId, row.activityName || row.activityId);
    return [...choices].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data, rows]);
  const total = Math.round(filteredRows.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;
  const invoiceCount = new Set(filteredRows.map((row) => row.invoiceId).filter(Boolean)).size;
  const studentCount = new Set(filteredRows.map((row) => row.studentId).filter(Boolean)).size;
  return (
    <div className="ui-page mx-auto w-full space-y-5">
      <Link to="/finance" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600"><ArrowLeft size={16} /> Back to overview</Link>
      <div><h1 className="ui-page-title">{metrics[metric].title}</h1><p className="mt-2 text-sm text-slate-500">{metrics[metric].description}</p></div>
      {metric === "expected-income" && <BSMonthSelect value={month} onChange={setMonth} />}
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Unable to load financial data: {error}</p> : loading ? <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading financial records...</p> : data && <>
        <div className="ui-surface p-5"><p className="text-sm text-slate-500">{activityIds.length || search ? "Filtered total" : "Total"}{metric === "expected-income" ? ` · ${month} (BS)` : ""}</p><p className="mt-2 text-3xl font-bold text-slate-900">{currency(total)}</p><p className="mt-2 text-sm text-slate-500">{filteredRows.length} records{studentCount ? ` · ${studentCount} students` : ""}{invoiceCount ? ` · ${invoiceCount} invoices` : ""}</p></div>
        <section className="ui-surface p-4 sm:p-5">
          {supportsActivities && <ActivityMultiSelect options={options} selected={activityIds} onChange={setActivityIds} />}
          <ListToolbar search={search} onSearchChange={setSearch} resultCount={filteredRows.length} placeholder="Search student, reference or description..." onClear={() => { setSearch(""); setActivityIds([]); }} />
          {filteredRows.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No matching records. Try changing the search or activity selection.</p> : <div className="overflow-x-auto"><table className="ui-table">
            <thead className="ui-table-head"><tr><th className="px-4 py-3">Student / party</th><th className="px-4 py-3">Reference</th>{supportsActivities && <th className="px-4 py-3">Activity</th>}<th className="px-4 py-3">{metric === "expected-income" ? "Month (BS)" : "Date (BS)"}</th><th className="px-4 py-3">Details</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-slate-200"><PaginatedList items={filteredRows} table>{(row) => <tr key={row.id}>
              <td className="px-4 py-3">{row.name}</td><td className="px-4 py-3">{row.invoiceId ? <Link className="text-brand-600 underline" to={`/finance/billing?studentId=${encodeURIComponent(row.studentId || "")}&action=payment`}>{row.reference}</Link> : row.reference}</td>
              {supportsActivities && <td className="px-4 py-3">{row.activityName || "Unassigned"}</td>}<td className="px-4 py-3">{row.date || "—"}</td><td className="px-4 py-3"><p>{row.description}</p><p className="text-xs text-slate-500">{row.type}</p></td><td className="px-4 py-3 text-right font-semibold">{currency(row.amount)}</td>
            </tr>}</PaginatedList></tbody>
          </table></div>}
        </section>
      </>}
    </div>
  );
}
