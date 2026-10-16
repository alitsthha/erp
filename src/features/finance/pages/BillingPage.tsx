import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import SearchableSelect from "@/components/forms/SearchableSelect";
import BillingChargeEditor from "../components/BillingChargeEditor";
import { applyBillingSelection, defaultBillingSelection, type BillingSelection } from "../services/billing-selection.service";
import { billingLineQuantity, billingLineDetail, billingLineRate } from "../components/invoice-document";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type jsPDF from "jspdf";

import {
  AlertCircle,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  UserRound,
} from "lucide-react";

import InvoiceDocument from "../components/InvoiceDocument";
import { buildInvoicePdf } from "../services/invoice-pdf.service";

import {
  formatBSDate,
  getCurrentBSDate,
} from "@/utils/nepali-date";

import type { Student } from "@/features/students/types/student.types";

import {
  getStudentsForEnrollment,
} from "@/features/enrollments/services/enrollment.service";

import {
  calculateStudentMonthlyFee,
  getInclusiveBsMonthCount,
} from "../services/fee-calculation.service";

import {
  createInvoiceFromStudentFee,
  getInvoices,
  updateInvoice,
} from "../services/invoice.service";

import {
  getStudentById,
} from "@/features/students/services/student.service";

import {
  createPayment,
} from "../services/payment.service";
import { getSettings } from "@/features/settings/services/settings.service";

import InvoiceTable from "../components/InvoiceTable";
import PaymentForm from "../forms/PaymentForm";
import NepaliDatePickerInput from "@/components/forms/NepaliDatePickerInput";

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

const ORGANIZATION_DETAILS = {
  name: "Young Explorers Academy",
  tagline: "Quality Education • Holistic Growth",
  address: "Baluwatar, Kathmandu, Nepal",
  phone: "+977-1-4567890",
  email: "info@youngexplorersnepal.com",
  website: "https://youngexplorersnepal.com/",
};

export default function BillingPage() {
  const { isAdmin } = useAuth();
  const [students, setStudents] =
    useState<Student[]>([]);

  const [selectedStudentId, setSelectedStudentId] =
    useState("");

  const [billingDate, setBillingDate] =
    useState(getCurrentBSDate());

  const [invoiceDate, setInvoiceDate] = useState(getCurrentBSDate());
  const [billingStartMonth, setBillingStartMonth] = useState(getCurrentBSDate().slice(0, 7));
  const [selection, setSelection] = useState<BillingSelection>({});
  const month = billingDate.slice(0, 7);
  const monthCount = getInclusiveBsMonthCount(billingStartMonth, month);
  const calculationRequest = useRef(0);

  const [calculatedSummary, setSummary] =
    useState<StudentFeeSummary | null>(
      null
    );

  const summary = useMemo(() => calculatedSummary ? applyBillingSelection(calculatedSummary, selection) : null, [calculatedSummary, selection]);

  const [discount, setDiscount] =
    useState(0);
  const appliedDiscount = Math.min(Math.max(discount, 0), summary?.totalAmount ?? 0);
  const newInvoiceTotal = Math.round(((summary?.totalAmount ?? 0) - appliedDiscount) * 100) / 100;
  const advanceToApply = Math.min(summary?.availableAdvance ?? 0, newInvoiceTotal);
  const newInvoiceDue = Math.round((newInvoiceTotal - advanceToApply) * 100) / 100;

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

  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] =
    useState<Invoice | null>(null);

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editInvoiceDate, setEditInvoiceDate] = useState("");
  const [editInvoiceTotal, setEditInvoiceTotal] = useState(0);

  const [loadedInvoiceCustomer, setInvoiceCustomer] = useState<Student | null>(null);
  const invoiceCustomer = loadedInvoiceCustomer?.id === selectedInvoiceForPreview?.studentId
    ? loadedInvoiceCustomer
    : null;

  const [exportingInvoicePdf, setExportingInvoicePdf] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [isSendInvoiceModalOpen, setIsSendInvoiceModalOpen] = useState(false);
  const [organizationPan, setOrganizationPan] = useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
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

  useEffect(() => {
    void getSettings()
      .then((settings) => setOrganizationPan(settings.taxId?.trim() ?? ""))
      .catch((err) => console.error("Failed to load organization PAN:", err));
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
    if (!selectedInvoiceForPreview) {
      return;
    }

    let mounted = true;

    async function loadInvoiceCustomer() {
      try {
        const studentId = selectedInvoiceForPreview?.studentId;
        if (!studentId) {
          if (mounted) setInvoiceCustomer(null);
          return;
        }

        const student = await getStudentById(studentId);

        if (mounted) {
          setInvoiceCustomer(student ?? null);
        }
      } catch (error) {
        console.error("Failed to load invoice customer information:", error);

        if (mounted) {
          setInvoiceCustomer(null);
        }
      }
    }

    void loadInvoiceCustomer();

    return () => {
      mounted = false;
    };
  }, [selectedInvoiceForPreview]);

async function createInvoicePdf(): Promise<jsPDF | null> {
  if (!selectedInvoiceForPreview) {
    return null;
  }

  try {
    return await buildInvoicePdf({
      invoice: selectedInvoiceForPreview,
      customer: invoiceCustomer,
      organization: ORGANIZATION_DETAILS,
      pan: organizationPan,
    });
  } catch (err) {
    console.error("Failed to export invoice PDF:", err);
    setError("Unable to prepare the invoice PDF. Please try again.");
    return null;
  }
}

async function handleDownloadInvoicePdf() {
  setExportingInvoicePdf(true);
  try {
    const pdf = await createInvoicePdf();
    if (pdf && selectedInvoiceForPreview) {
      pdf.save(`invoice-${selectedInvoiceForPreview.invoiceNumber}.pdf`);
    }
  } finally {
    setExportingInvoicePdf(false);
  }
}

function normalizeWhatsappNumber(value: string): string {
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly.startsWith("0") ? digitsOnly.slice(1) : digitsOnly;
}

async function handleSendInvoiceSelection(method: "mail" | "whatsapp") {
  const invoice = selectedInvoiceForPreview;
  if (!invoice) return;

  try {
    setSendingInvoice(true);
    setError("");

    const pdf = await createInvoicePdf();
    if (!pdf) {
      throw new Error("Unable to prepare the invoice PDF.");
    }

    const pdfBlob = pdf.output("blob");
    const fileName = `invoice-${invoice.invoiceNumber}.pdf`;
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = pdfUrl;
    downloadLink.download = fileName;
    downloadLink.click();

    const parentName = invoiceCustomer?.guardianName || invoiceCustomer?.parentName || "Parent / Guardian";
    const messageBody = `Dear ${parentName},\n\nThe invoice for ${invoice.studentName} (${invoice.billingMonth}) is ready.\nInvoice: ${invoice.invoiceNumber}\nPAN: ${organizationPan || "Not configured"}\nTotal due: Rs. ${formatCurrency(invoice.totalAmount)}\n\nPlease contact ${ORGANIZATION_DETAILS.email} if you have any questions.`;

    if (method === "mail") {
      const recipient = invoiceCustomer?.guardianEmail || invoiceCustomer?.parentEmail || invoiceCustomer?.studentEmail || "";
      if (!recipient) {
        setError("No parent or student email is saved for this student.");
        return;
      }

      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(`Invoice ${invoice.invoiceNumber} for ${invoice.studentName}`)}&body=${encodeURIComponent(`${messageBody}\n\nInvoice PDF downloaded: ${fileName}`)}`;
      window.open(gmailUrl, "_blank", "noopener,noreferrer");
      setSuccess(`Gmail compose window opened for ${recipient}.`);
      if (invoice.id) {
        await updateInvoice(invoice.id, {
          status: "Sent (Mail)",
        });
        await loadInvoices();
      }
    } else {
      const whatsappNumber = normalizeWhatsappNumber(invoiceCustomer?.guardianPhone || invoiceCustomer?.parentPhone || "");
      const whatsappUrl = whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`${messageBody}\n\nInvoice PDF downloaded: ${fileName}`)}`
        : `https://wa.me/?text=${encodeURIComponent(`${messageBody}\n\nInvoice PDF downloaded: ${fileName}`)}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      setSuccess("WhatsApp share window opened with the invoice details.");
      if (invoice.id) {
        await updateInvoice(invoice.id, {
          status: "Sent (WhatsApp)",
        });
        await loadInvoices();
      }
    }

    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
    setIsSendInvoiceModalOpen(false);
  } catch (err) {
    console.error("Failed to prepare invoice share:", err);
    setError(err instanceof Error ? err.message : "Unable to prepare invoice sharing.");
  } finally {
    setSendingInvoice(false);
  }
}

  useEffect(() => {
    void loadInvoices();
  }, []);

  /* =====================================================
     SELECT STUDENT
  ===================================================== */

  function handleStudentChange(
    studentId: string
  ) {
    calculationRequest.current++;
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
      calculationRequest.current++;
      setError("");
      setSuccess("");

      await createInvoiceFromStudentFee(selectedStudentId, month, {
        discount,
        invoiceDate,
        selection,
        billingDate,
        months: monthCount,
        startMonth: billingStartMonth,
      });

      await loadInvoices();
      setSummary(null);

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

  async function handleEditInvoiceSave() {
    if (!editingInvoice || !editingInvoice.id) {
      return;
    }

    const nextTotal = Number(editInvoiceTotal);
    const validDate = editInvoiceDate.trim();

    if (!validDate) {
      setError("Invoice date is required.");
      return;
    }

    if (!Number.isFinite(nextTotal) || nextTotal < 0) {
      setError("Total amount must be a valid number.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      const nextDueAmount = Math.max(nextTotal - editingInvoice.paidAmount, 0);
      const nextStatus =
        editingInvoice.status === "Sent (Mail)" || editingInvoice.status === "Sent (WhatsApp)"
          ? editingInvoice.status
          : nextTotal <= 0
            ? "Draft"
            : editingInvoice.paidAmount >= nextTotal
              ? "Paid"
              : editingInvoice.paidAmount > 0
                ? "Partially Paid"
                : "Unpaid";

      await updateInvoice(editingInvoice.id, {
        invoiceDate: validDate,
        totalAmount: nextTotal,
        dueAmount: nextDueAmount,
        status: nextStatus,
      });

      setEditingInvoice(null);
      setEditInvoiceDate("");
      setEditInvoiceTotal(0);
      await loadInvoices();
      setSuccess("Invoice updated successfully.");
    } catch (err) {
      console.error("Failed to update invoice:", err);
      setError(err instanceof Error ? err.message : "Unable to update invoice.");
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
      calculationRequest.current++;
      setSummary(null);
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
        "The current Nepali month is not available."
      );

      return;
    }

    if (!/^\d{4}-\d{2}$/.test(billingStartMonth) || billingStartMonth > month) {
      setError("The billing period must start on or before the charges through date.");
      return;
    }

    const request = ++calculationRequest.current;
    try {
      setLoadingFee(true);
      setSummary(null);
      setError("");

      const result =
        await calculateStudentMonthlyFee(
          selectedStudentId,
          month,
          { billingDate, months: monthCount, startMonth: billingStartMonth, paymentDate: invoiceDate }
        );

      if (request === calculationRequest.current) {
        setSelection(defaultBillingSelection(result));
        setSummary(result);
      }
    } catch (err) {
      console.error(
        "Failed to calculate student fee:",
        err
      );

      if (request === calculationRequest.current) setError("Unable to calculate the student's fee.");
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
      <div className="ui-page mx-auto w-full space-y-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-brand-600 p-2.5">
                <FileText
                  size={20}
                  className="text-white"
                />
              </div>

              <div>
                <h1 className="ui-page-title">
                  Billing
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Calculate student fees from enrollment and attendance.
                </p>
              </div>
            </div>
          </div>
          {isAdmin && <Link to="/enrollments/bulk" className="ui-button border border-slate-200 bg-white text-slate-700">Bulk Enrollment</Link>}
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

        <section className="ui-surface p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="ui-section-title">
              Create Student Bill
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Calculate new fees and payments received through the selected billing date.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Student */}
            <div className="sm:col-span-2">
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

                <SearchableSelect
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
                  className="ui-field w-full appearance-none pl-10 pr-4 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                >
                  <option value="">
                    {loadingStudents
                      ? "Loading students..."
                      : "Select student"}
                  </option>

                  {students.map(
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
                </SearchableSelect>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 sm:col-span-2 lg:grid-cols-3">
            <NepaliDatePickerInput
              label="Invoice date (BS)"
              value={invoiceDate}
              onChange={(value) => {
                calculationRequest.current++;
                setInvoiceDate(value);
                setSummary(null);
              }}
              helperText="Date printed on the invoice. Payments are included through this date; changing it does not add monthly fees."
            />

            <NepaliDatePickerInput
              label="Billing period starts (BS)"
              value={billingStartMonth ? `${billingStartMonth}-01` : ""}
              onChange={(value) => {
                calculationRequest.current++;
                setBillingStartMonth(value.slice(0, 7));
                setSummary(null);
              }}
              helperText="Choose the first month to review. You can uncheck individual months after calculating."
            />

            <NepaliDatePickerInput
              label="Charges through (BS)"
              value={billingDate}
              onChange={(value) => {
                calculationRequest.current++;
                setBillingDate(value);
                setSummary(null);
              }}
              helperText="Review attended sessions through this date. Select which monthly fees to include after calculating."
            />
            </div>

            <div>
              <label
                htmlFor="discount"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Discount (Rs.)
              </label>

              <input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(Number(event.target.value) || 0)}
                className="ui-field w-full px-4 text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-slate-200"
                placeholder="0"
              />
            </div>

            {/* Calculate */}
            <div className="flex items-end">
              <div className="flex w-full flex-col gap-2 lg:w-auto">
                <p className="text-sm font-medium text-slate-600">
                  {monthCount} month{monthCount === 1 ? "" : "s"} to review
                </p>
                <button
                  type="button"
                  onClick={
                    handleCalculate
                  }
                  disabled={
                    loadingFee ||
                    creatingInvoice ||
                    !selectedStudentId ||
                    !month
                  }
                  className="ui-button flex w-full items-center justify-center gap-2 bg-brand-600 py-3 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="ui-button flex w-full items-center justify-center gap-2 bg-emerald-600 py-3 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          <section className="ui-surface p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Selected Student
                </p>

                <h2 className="ui-section-title mt-1">
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
                    New invoice due
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Rs.{" "}
                    {formatCurrency(
                      newInvoiceDue
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
          <section className="ui-surface overflow-hidden">

            {/* Invoice-style header */}
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Student Fee Statement
                  </p>

                  <h2 className="ui-section-title mt-1">
                    {summary.studentName}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Student Code:{" "}
                    {summary.studentCode}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Date
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatBSDate(invoiceDate)}
                  </p>
                </div>
              </div>
            </div>

            {calculatedSummary && <BillingChargeEditor summary={calculatedSummary} selection={selection} onChange={setSelection} disabled={creatingInvoice || loadingFee} />}

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="ui-table min-w-[760px]">
                <thead className="ui-table-head">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      Activity
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Sessions / period
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Rate
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Monthly Fee
                    </th>

                    <th className="px-4 py-3 text-right font-semibold">
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
                        className="px-4 py-12 text-center"
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
                          <td className="px-4 py-3">
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

                          <td className="px-4 py-3 text-sm text-slate-700">
                            {billingLineQuantity(line)}
                            <span className="block text-xs text-slate-500">{billingLineDetail(line)}</span>
                          </td>

                          <td className="px-4 py-3 text-sm text-slate-700">
                            Rs.{" "}
                            {formatCurrency(
                              billingLineRate(line)
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-slate-700">
                            Rs.{" "}
                            {formatCurrency(
                              line.monthlyFeeAmount
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
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
                            Sessions / period
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {billingLineQuantity(line)}
                            <span className="block text-xs text-slate-500">{billingLineDetail(line)}</span>
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            Rate
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            Rs.{" "}
                            {formatCurrency(
                              billingLineRate(line)
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
                              line.monthlyFeeAmount
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
              <div className="mb-6 rounded-xl border border-brand-100 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Earlier invoices through {formatBSDate(invoiceDate)}</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-slate-500">Previously invoiced</dt><dd className="mt-1 font-semibold">Rs. {formatCurrency(summary.previousInvoiceTotal)}</dd></div>
                  <div><dt className="text-slate-500">Payments received</dt><dd className="mt-1 font-semibold text-emerald-700">Rs. {formatCurrency(summary.paidThroughDate)}</dd></div>
                  <div><dt className="text-slate-500">Remaining on earlier invoices</dt><dd className="mt-1 font-semibold">Rs. {formatCurrency(summary.previousBalance)}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-slate-500">Earlier balances stay on their original invoices. The new invoice contains only fees not already billed.</p>
              </div>
              <div className="ml-auto w-full max-w-md space-y-3">
                <div className="flex justify-between text-sm text-slate-600"><span>Fees for selected period</span><span>Rs. {formatCurrency(summary.grossAmount)}</span></div>
                <div className="flex justify-between text-sm text-slate-600"><span>Already invoiced in this period</span><span>− Rs. {formatCurrency(summary.previouslyBilledAmount)}</span></div>
                {calculatedSummary && calculatedSummary.totalAmount > summary.totalAmount && <div className="flex justify-between text-sm text-slate-600"><span>Left for a later invoice</span><span>− Rs. {formatCurrency(calculatedSummary.totalAmount - summary.totalAmount)}</span></div>}
                <div className="flex justify-between text-sm font-semibold"><span>Selected new fees</span><span>Rs. {formatCurrency(summary.totalAmount)}</span></div>
                {appliedDiscount > 0 && <div className="flex justify-between text-sm text-slate-600"><span>Discount</span><span>− Rs. {formatCurrency(appliedDiscount)}</span></div>}
                <div className="flex justify-between text-sm text-emerald-700"><span>Advance payment applied</span><span>− Rs. {formatCurrency(advanceToApply)}</span></div>

                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>
                    Activities
                  </span>

                  <span>
                    {summary.lines.filter((line) => line.calculatedAmount > 0).length}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-base font-semibold text-slate-900">
                    New invoice due
                  </span>

                  <span className="text-2xl font-bold text-slate-900">
                    Rs.{" "}
                    {formatCurrency(
                      newInvoiceDue
                    )}
                  </span>
                </div>

              </div>
              {summary.totalAmount <= 0 && <p className="mt-4 text-sm text-brand-700">No charges selected for this invoice.{summary.previouslyBilledAmount > 0 ? " Existing charges have already been billed." : ""}</p>}
            </div>
          </section>
        )}

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        <section className="ui-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="ui-section-title">
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
              onView={(invoice) => setSelectedInvoiceForPreview(invoice)}
              onEdit={(invoice) => {
                setEditingInvoice(invoice);
                setEditInvoiceDate(invoice.invoiceDate);
                setEditInvoiceTotal(invoice.totalAmount);
              }}
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
            <div className="ui-surface border-dashed border-slate-300 p-10 text-center sm:p-16">
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
                Select a student, then calculate the bill to see attendance-based fees for the current Nepali month.
              </p>
            </div>
          )}

      </div>

      {selectedInvoiceForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-slate-100 p-3 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-label="Invoice preview">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Invoice Preview
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownloadInvoicePdf()}
                  disabled={exportingInvoicePdf}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportingInvoicePdf ? "Preparing..." : "Download PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSendInvoiceModalOpen(true)}
                  disabled={sendingInvoice || !invoiceCustomer}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={15} />
                  {sendingInvoice ? "Preparing..." : "Send to Parent"}
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedInvoiceForPreview(null); setIsSendInvoiceModalOpen(false); }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            {isSendInvoiceModalOpen && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                      Share invoice
                    </p>
                    <h4 className="mt-1 text-lg font-semibold text-emerald-900">
                      Choose delivery method
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSendInvoiceModalOpen(false)}
                    className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void handleSendInvoiceSelection("mail")}
                    disabled={sendingInvoice}
                    className="min-h-11 flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Mail size={17} className="text-brand-600" />
                    Send with Mail
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSendInvoiceSelection("whatsapp")}
                    disabled={sendingInvoice}
                    className="ui-button flex items-center justify-center gap-2 bg-green-600 py-3 text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <MessageCircle size={17} />
                    Send with WhatsApp
                  </button>
                </div>
              </div>
            )}

            <InvoiceDocument
              invoice={selectedInvoiceForPreview}
              customer={invoiceCustomer}
              organization={ORGANIZATION_DETAILS}
              pan={organizationPan}
            />
          </div>
        </div>
      )}

      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Edit Invoice</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">{editingInvoice.invoiceNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingInvoice(null);
                  setEditInvoiceDate("");
                  setEditInvoiceTotal(0);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Invoice Date
                <input
                  type="date"
                  value={editInvoiceDate}
                  onChange={(event) => setEditInvoiceDate(event.target.value)}
                  className="ui-field mt-1.5 w-full px-3 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Total Amount (Rs.)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editInvoiceTotal}
                  onChange={(event) => setEditInvoiceTotal(Number(event.target.value) || 0)}
                  className="ui-field mt-1.5 w-full px-3 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingInvoice(null);
                  setEditInvoiceDate("");
                  setEditInvoiceTotal(0);
                }}
                className="ui-button border border-slate-200 bg-white py-2.5 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleEditInvoiceSave()}
                className="ui-button bg-brand-600 py-2.5 text-white hover:bg-brand-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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
