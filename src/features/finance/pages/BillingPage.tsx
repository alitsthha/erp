import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CalendarDays,
  FileText,
  Loader2,
  Search,
  UserRound,
} from "lucide-react";

import type { Student } from "@/features/students/types/student.types";

import {
  getStudentsForEnrollment,
} from "@/features/enrollments/services/enrollment.service";

import {
  calculateStudentMonthlyFee,
} from "../services/fee-calculation.service";

import {
  createInvoiceFromStudentFee,
  getInvoices,
} from "../services/invoice.service";

import {
  createPayment,
} from "../services/payment.service";

import InvoiceTable from "../components/InvoiceTable";
import PaymentForm from "../forms/PaymentForm";

import type {
  Invoice,
} from "../types/invoice.types";

import type {
  StudentFeeSummary,
} from "../services/fee-calculation.service";

function formatCurrency(
  amount: number
): string {
  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  ).format(amount);
}

function getCurrentBSMonth(): string {
  /*
   * Default month.
   *
   * Change this value to your current
   * Nepali BS month when necessary.
   */
  return "2083-04";
}

export default function BillingPage() {
  const [students, setStudents] =
    useState<Student[]>([]);

  const [selectedStudentId, setSelectedStudentId] =
    useState("");

  const [month, setMonth] =
    useState(getCurrentBSMonth());

  const [summary, setSummary] =
    useState<StudentFeeSummary | null>(
      null
    );

  const [invoices, setInvoices] =
    useState<Invoice[]>([]);

  const [loadingStudents, setLoadingStudents] =
    useState(true);

  const [loadingFee, setLoadingFee] =
    useState(false);

  const [loadingInvoices, setLoadingInvoices] =
    useState(true);

  const [creatingInvoice, setCreatingInvoice] =
    useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] =
    useState(false);

  const [selectedInvoice, setSelectedInvoice] =
    useState<Invoice | null>(null);

  const [isSubmittingPayment, setIsSubmittingPayment] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  /* =====================================================
     LOAD STUDENTS
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadStudents() {
      try {
        setLoadingStudents(true);
        setError("");

        const result =
          await getStudentsForEnrollment();

        if (mounted) {
          setStudents(result);
        }
      } catch (err) {
        console.error(
          "Failed to load students:",
          err
        );

        if (mounted) {
          setError(
            "Unable to load students."
          );
        }
      } finally {
        if (mounted) {
          setLoadingStudents(false);
        }
      }
    }

    loadStudents();

    return () => {
      mounted = false;
    };
  }, []);

  async function loadInvoices() {
    try {
      setLoadingInvoices(true);
      const result = await getInvoices();
      setInvoices(result);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoadingInvoices(false);
    }
  }

  useEffect(() => {
    void loadInvoices();
  }, []);

  /* =====================================================
     FILTER STUDENTS
  ===================================================== */

  const filteredStudents =
    useMemo(() => {
      const value =
        search.trim().toLowerCase();

      if (!value) {
        return students;
      }

      return students.filter(
        (student) =>
          student.fullName
            .toLowerCase()
            .includes(value) ||
          student.studentCode
            .toLowerCase()
            .includes(value)
      );
    }, [students, search]);

  /* =====================================================
     SELECT STUDENT
  ===================================================== */

  function handleStudentChange(
    studentId: string
  ) {
    setSelectedStudentId(
      studentId
    );

    setSummary(null);
    setError("");
    setSuccess("");
  }

  async function handleCreateInvoice() {
    if (!selectedStudentId) {
      setError("Please select a student first.");
      return;
    }

    if (!summary || summary.totalAmount <= 0) {
      setError("There is no amount to invoice for the selected student.");
      return;
    }

    try {
      setCreatingInvoice(true);
      setError("");
      setSuccess("");

      await createInvoiceFromStudentFee(selectedStudentId, month, {
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      });

      await loadInvoices();

      setSuccess(
        `Invoice generated successfully for ${selectedStudent?.fullName ?? "student"}.`
      );
    } catch (err) {
      console.error("Error generating invoice:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate invoice."
      );
    } finally {
      setCreatingInvoice(false);
    }
  }

  async function handlePaymentSubmit(
    data: Parameters<typeof createPayment>[0]
  ) {
    try {
      setIsSubmittingPayment(true);
      setError("");

      await createPayment(data);
      await loadInvoices();
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      setSuccess(
        `Payment recorded successfully for invoice ${data.invoiceNumber}.`
      );
    } catch (err) {
      console.error("Failed to record payment:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to record payment."
      );
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  /* =====================================================
     CALCULATE FEE
  ===================================================== */

  async function handleCalculate() {
    if (!selectedStudentId) {
      setError(
        "Please select a student first."
      );

      return;
    }

    if (!month) {
      setError(
        "Please select a billing month."
      );

      return;
    }

    try {
      setLoadingFee(true);
      setError("");

      const result =
        await calculateStudentMonthlyFee(
          selectedStudentId,
          month
        );

      setSummary(result);
    } catch (err) {
      console.error(
        "Failed to calculate student fee:",
        err
      );

      setError(
        "Unable to calculate the student's fee."
      );
    } finally {
      setLoadingFee(false);
    }
  }

  /* =====================================================
     SELECTED STUDENT
  ===================================================== */

  const selectedStudent =
    students.find(
      (student) =>
        student.id ===
        selectedStudentId
    );

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-2.5">
                <FileText
                  size={20}
                  className="text-white"
                />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Billing
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Calculate student fees from enrollment and attendance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* =================================================
            FILTER CARD
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Create Student Bill
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select a student and billing month to calculate the current amount.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px_auto]">

            {/* Student */}
            <div>
              <label
                htmlFor="student"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Student
              </label>

              <div className="relative">
                <UserRound
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  id="student"
                  value={
                    selectedStudentId
                  }
                  onChange={(event) =>
                    handleStudentChange(
                      event.target.value
                    )
                  }
                  disabled={
                    loadingStudents
                  }
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                >
                  <option value="">
                    {loadingStudents
                      ? "Loading students..."
                      : "Select student"}
                  </option>

                  {filteredStudents.map(
                    (student) => (
                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {student.fullName} —{" "}
                        {
                          student.studentCode
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Search */}
              <div className="relative mt-2">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search student name or code"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>

            {/* Month */}
            <div>
              <label
                htmlFor="billingMonth"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Billing Month
              </label>

              <div className="relative">
                <CalendarDays
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="billingMonth"
                  type="month"
                  value={month}
                  onChange={(event) =>
                    setMonth(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Use your BS YYYY-MM value.
              </p>
            </div>

            {/* Calculate */}
            <div className="flex items-end">
              <div className="flex w-full flex-col gap-2 lg:w-auto">
                <button
                  type="button"
                  onClick={
                    handleCalculate
                  }
                  disabled={
                    loadingFee ||
                    !selectedStudentId ||
                    !month
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingFee ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Calculating...
                    </>
                  ) : (
                    <>
                      <FileText
                        size={17}
                      />

                      Calculate Bill
                    </>
                  )}
                </button>

                {summary && summary.totalAmount > 0 && (
                  <button
                    type="button"
                    onClick={handleCreateInvoice}
                    disabled={creatingInvoice}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingInvoice ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText size={17} />
                        Generate Invoice
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            SELECTED STUDENT
        ================================================= */}

        {selectedStudent && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Selected Student
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {
                    selectedStudent.fullName
                  }
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    selectedStudent.studentCode
                  }
                </p>
              </div>

              {summary && (
                <div className="rounded-xl bg-slate-50 px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Total Due
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Rs.{" "}
                    {formatCurrency(
                      summary.totalAmount
                    )}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            BILLING DETAILS
        ================================================= */}

        {summary && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* Invoice-style header */}
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Student Fee Statement
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {summary.studentName}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Student Code:{" "}
                    {summary.studentCode}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Billing Month
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {summary.month}
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">
                      Activity
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Sessions
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Session Fee
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Monthly Fee
                    </th>

                    <th className="px-6 py-4 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {summary.lines.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center"
                      >
                        <p className="text-sm font-medium text-slate-700">
                          No active enrollments found.
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Check the student's enrollment status.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    summary.lines.map(
                      (line) => (
                        <tr
                          key={
                            line.enrollmentId
                          }
                          className="hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-900">
                              {
                                line.activityName
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {
                                line.activityCode
                              }
                            </p>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-700">
                            {
                              line.attendedSessions
                            }{" "}
                            /{" "}
                            {
                              line.expectedSessions
                            }
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-700">
                            Rs.{" "}
                            {formatCurrency(
                              line.sessionFee
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-700">
                            Rs.{" "}
                            {formatCurrency(
                              line.monthlyFee
                            )}
                          </td>

                          <td className="px-6 py-4 text-right font-semibold text-slate-900">
                            Rs.{" "}
                            {formatCurrency(
                              line.calculatedAmount
                            )}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 p-4 md:hidden">
              {summary.lines.length ===
              0 ? (
                <div className="rounded-xl bg-slate-50 p-5 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No active enrollments found.
                  </p>
                </div>
              ) : (
                summary.lines.map(
                  (line) => (
                    <div
                      key={
                        line.enrollmentId
                      }
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {
                              line.activityName
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {
                              line.activityCode
                            }
                          </p>
                        </div>

                        <p className="font-bold text-slate-900">
                          Rs.{" "}
                          {formatCurrency(
                            line.calculatedAmount
                          )}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                        <div>
                          <p className="text-xs text-slate-400">
                            Sessions
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {
                              line.attendedSessions
                            }{" "}
                            /{" "}
                            {
                              line.expectedSessions
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            Session Fee
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            Rs.{" "}
                            {formatCurrency(
                              line.sessionFee
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            Monthly
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            Rs.{" "}
                            {formatCurrency(
                              line.monthlyFee
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            {/* Totals */}
            <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6">
              <div className="ml-auto w-full max-w-md space-y-3">

                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>
                    Activities
                  </span>

                  <span>
                    {summary.lines.length}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-base font-semibold text-slate-900">
                    Total Amount
                  </span>

                  <span className="text-2xl font-bold text-slate-900">
                    Rs.{" "}
                    {formatCurrency(
                      summary.totalAmount
                    )}
                  </span>
                </div>

              </div>
            </div>
          </section>
        )}

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Invoices & Receivables
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Generated invoices and outstanding due amounts.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <InvoiceTable
              invoices={invoices}
              isLoading={loadingInvoices}
              onRecordPayment={(invoice) => {
                setSelectedInvoice(invoice);
                setIsPaymentModalOpen(true);
                setError("");
              }}
            />
          </div>
        </section>

        {!summary &&
          !loadingFee && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center sm:p-16">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <FileText
                  size={22}
                  className="text-slate-500"
                />
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No billing statement yet
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Select a student and billing month, then calculate the bill to see attendance-based fees.
              </p>
            </div>
          )}

      </div>

      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Record Payment
                </p>

                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedInvoice.invoiceNumber}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedInvoice(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <PaymentForm
              invoice={selectedInvoice}
              onSubmit={handlePaymentSubmit}
              onCancel={() => {
                setIsPaymentModalOpen(false);
                setSelectedInvoice(null);
              }}
              isSubmitting={isSubmittingPayment}
            />
          </div>
        </div>
      )}
    </div>
  );
}