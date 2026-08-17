import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, ChevronLeft, Plus, Trash2 } from "lucide-react";

import BsDateSelect from "@/components/forms/BsDateSelect";
import PageContainer from "@/components/common/PageContainer";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { convertADToBS, formatBSDate, getCurrentBSDate } from "@/utils/nepali-date";
import { createPayment, deletePayment, getPaymentsByStaffId } from "@/features/finance/services/payment.service";
import { paymentSchema, type PaymentFormData } from "../schemas/staff.schema";
import { useStaff } from "../hooks/useStaff";
import type { PaymentRecord } from "../types/staff.types";

function normalizeToBsDate(value?: string): string {
  if (!value) return "";

  const year = Number(value.slice(0, 4));
  if (Number.isFinite(year) && year >= 2070 && year <= 2100) {
    return value;
  }

  return convertADToBS(value);
}

export default function PaymentGrantPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const { staffs } = useStaff();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const staff = staffs.find((s) => s.id === staffId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      staffId: staffId || "",
      status: "pending",
      paymentDate: getCurrentBSDate(),
    },
  });

  const paymentDateValue = watch("paymentDate") || getCurrentBSDate();

  useEffect(() => {
    if (!staffId) return;
    loadPayments();
  }, [staffId]);

  const loadPayments = async () => {
    if (!staffId) return;

    try {
      setLoadingPayments(true);
      const data = await getPaymentsByStaffId(staffId);
      setPayments(
        data.map((payment) => ({
          id: payment.id ?? "",
          staffId: payment.staffId ?? staffId,
          staffName: payment.staffName ?? staff?.fullName ?? "",
          amount: payment.amount,
          paymentType: payment.paymentType ?? "monthly",
          paymentDate: payment.paymentDate,
          status: payment.status ?? "pending",
          notes: payment.notes ?? "",
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        }))
      );
    } finally {
      setLoadingPayments(false);
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      setSubmitting(true);
      await createPayment({
        staffId: data.staffId,
        staffName: staff?.fullName ?? "",
        amount: data.amount,
        paymentType: data.paymentType,
        paymentDate: normalizeToBsDate(data.paymentDate),
        paymentMethod: "Cash",
        notes: data.notes ?? "",
        status: data.status,
      } as any);
      reset({
        staffId: staffId || "",
        status: "pending",
        paymentDate: getCurrentBSDate(),
        amount: 0,
        paymentType: "monthly",
        notes: "",
      });
      await loadPayments();
    } catch (error) {
      console.error(error);
      alert("Unable to add payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Delete this payment record?")) return;

    try {
      await deletePayment(paymentId);
      await loadPayments();
    } catch (error) {
      console.error(error);
      alert("Unable to delete payment.");
    }
  };

  if (!staffId || !staff) {
    return (
      <PageContainer>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Staff member not found.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/staff")}
            className="rounded-lg border border-slate-200 p-2 transition hover:bg-slate-50"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Payment & Salary Grants</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage payment records for {staff.fullName}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Plus size={20} />
              Add Payment
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Staff</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {staff.fullName}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  {...register("amount", { valueAsNumber: true })}
                  placeholder="Enter amount"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Payment Type *</label>
                <select
                  {...register("paymentType")}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select type</option>
                  <option value="monthly">Monthly Salary</option>
                  <option value="bonus">Bonus</option>
                  <option value="advance">Advance</option>
                  <option value="other">Other</option>
                </select>
                {errors.paymentType && <p className="mt-1 text-sm text-red-600">{errors.paymentType.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Payment Date (BS) *</label>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <BsDateSelect
                    label=""
                    value={paymentDateValue}
                    onChange={(value) => setValue("paymentDate", value, { shouldValidate: true })}
                    helperText="Select payment date in BS"
                    error={errors.paymentDate?.message?.toString()}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Status *</label>
                <select
                  {...register("status")}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  rows={3}
                  {...register("notes")}
                  placeholder="Add any additional notes"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting || submitting ? "Adding..." : "Add Payment"}
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Briefcase size={20} />
              Payment Records
            </h2>

            {loadingPayments ? (
              <LoadingSpinner />
            ) : payments.length === 0 ? (
              <div className="text-center text-slate-500">
                <p className="text-sm">No payment records yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Rs. {payment.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {payment.paymentType.charAt(0).toUpperCase() + payment.paymentType.slice(1)} • {formatBSDate(normalizeToBsDate(payment.paymentDate), "full")}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            payment.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : payment.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePayment(payment.id)}
                      className="text-red-600 transition hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
