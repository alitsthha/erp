import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import jsPDF from "jspdf";

import {
  AlertCircle,
  CalendarDays,
  FileText,
  Loader2,
  Search,
  UserRound,
} from "lucide-react";

import yeaLogo from "/yea-logo.png";

import { getCurrentBSDate } from "@/utils/nepali-date";

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
  getStudentById,
} from "@/features/students/services/student.service";

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
  return getCurrentBSDate().slice(0, 7);
}

const ORGANIZATION_DETAILS = {
  name: "Young Explorers Academy",
  tagline: "Quality Education • Holistic Growth",
  address: "Baluwatar, Kathmandu, Nepal",
  phone: "+977-1-4567890",
  email: "info@youngexplorers.edu.np",
  website: "www.youngexplorers.edu.np",
};

export default function BillingPage() {
  const [students, setStudents] =
    useState<Student[]>([]);

  const [selectedStudentId, setSelectedStudentId] =
    useState("");

  const [month, setMonth] =
    useState(getCurrentBSMonth());

  const [invoiceDate, setInvoiceDate] =
    useState(getCurrentBSDate());

  const [dueDate, setDueDate] =
    useState(getCurrentBSDate());

  const [summary, setSummary] =
    useState<StudentFeeSummary | null>(
      null
    );

  const [discount, setDiscount] =
    useState(0);

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

  const [invoiceCustomer, setInvoiceCustomer] = useState<Student | null>(null);

  const invoicePreviewRef = useRef<HTMLDivElement | null>(null);
  const [exportingInvoicePdf, setExportingInvoicePdf] = useState(false);

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
    if (!selectedInvoiceForPreview) {
      setInvoiceCustomer(null);
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

  async function handleDownloadInvoicePdf() {
    if (!selectedInvoiceForPreview) {
      return;
    }

    try {
      setExportingInvoicePdf(true);

      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const innerWidth = pageWidth - margin * 2;
      const invoice = selectedInvoiceForPreview;
      const parentName = invoiceCustomer?.guardianName || invoiceCustomer?.parentName || "Parent / Guardian";
      const studentName = invoiceCustomer?.fullName || invoice.studentName;

      const formatPDFDate = (value?: string) => {
        if (!value) return "—";

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
          return value;
        }

        return new Intl.DateTimeFormat("en-CA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(parsed);
      };

      const logo = new Image();
      logo.src = "/yea-logo.png";
      await new Promise<void>((resolve, reject) => {
        logo.onload = () => resolve();
        logo.onerror = () => reject(new Error("Unable to load invoice logo."));
      });

      pdf.setFillColor(241, 245, 249);
      pdf.rect(0, 0, pageWidth, 140, "F");
      pdf.setDrawColor(203, 213, 225);
      pdf.line(margin, 140, pageWidth - margin, 140);

      pdf.addImage(logo, "PNG", margin, 22, 72, 72);

      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(27);
      pdf.text("Young Explorers Academy", margin + 90, 52);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text("QUALITY EDUCATION • HOLISTIC GROWTH", margin + 90, 72);

      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(10);
      pdf.text("Baluwatar, Kathmandu, Nepal", pageWidth - margin - 120, 34, { align: "right" });
      pdf.text("+977-1-4567890", pageWidth - margin - 120, 50, { align: "right" });
      pdf.text("info@youngexplorers.edu.np", pageWidth - margin - 120, 66, { align: "right" });
      pdf.text("www.youngexplorers.edu.np", pageWidth - margin - 120, 82, { align: "right" });

      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(30);
      pdf.text("INVOICE", margin, 176);

      pdf.setFillColor(224, 242, 254);
      pdf.roundedRect(pageWidth - margin - 176, 150, 168, 88, 10, 10, "F");
      pdf.setTextColor(51, 65, 85);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("INVOICE #", pageWidth - margin - 158, 174);
      pdf.text("ISSUE DATE", pageWidth - margin - 158, 194);
      pdf.text("DUE DATE", pageWidth - margin - 158, 214);

      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(invoice.invoiceNumber, pageWidth - margin - 72, 174);
      pdf.text(formatPDFDate(invoice.invoiceDate), pageWidth - margin - 72, 194);
      pdf.text(formatPDFDate(invoice.dueDate || invoice.invoiceDate), pageWidth - margin - 72, 214);

      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, 236, innerWidth, 94, 10, 10, "F");
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("INVOICE TO", margin + 18, 264);

      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text(parentName, margin + 18, 292);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text("Parent / Guardian", margin + 18, 314);

      pdf.setFillColor(224, 242, 254);
      pdf.roundedRect(pageWidth - margin - 250, 252, 220, 64, 10, 10, "F");
      pdf.setTextColor(51, 65, 85);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("STUDENT", pageWidth - margin - 222, 272);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text(studentName, pageWidth - margin - 222, 292);
      pdf.text(`Code: ${invoice.studentCode}`, pageWidth - margin - 222, 308);

      pdf.setFillColor(15, 23, 42);
      pdf.roundedRect(margin, 352, innerWidth, 24, 6, 6, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("ACTIVITY", margin + 16, 369);
      pdf.text("SESSIONS", margin + 252, 369);
      pdf.text("SESSION FEE", margin + 338, 369);
      pdf.text("AMOUNT", margin + 450, 369);

      let currentY = 378;
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);

      invoice.lines.forEach((line) => {
        if (currentY > 640) {
          pdf.addPage();
          currentY = 60;
        }

        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, currentY, pageWidth - margin, currentY);

        const rowY = currentY + 16;
        pdf.text(line.activityName, margin + 16, rowY);
        pdf.text(`${line.sessionCount} / ${line.expectedSessions}`, margin + 252, rowY);
        pdf.text(`NPR ${formatCurrency(line.sessionFee)}`, margin + 338, rowY);
        pdf.text(`NPR ${formatCurrency(line.amount)}`, margin + 450, rowY);

        currentY += 32;
      });

      pdf.setDrawColor(203, 213, 225);
      pdf.line(margin, currentY + 12, pageWidth - margin, currentY + 12);

      pdf.setTextColor(51, 65, 85);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text("Payment Information", margin, currentY + 40);

      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(margin, currentY + 54, 230, 52, 8, 8, "F");
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "normal");
      pdf.text("Bank A/C No:", margin + 14, currentY + 76);
      pdf.setFont("helvetica", "bold");
      pdf.text("1234567890123", margin + 110, currentY + 76);
      pdf.setFont("helvetica", "normal");
      pdf.text("Accepted Methods:", margin + 14, currentY + 92);
      pdf.text("Online Banking, Wallet", margin + 110, currentY + 92);

      pdf.setTextColor(51, 65, 85);
      pdf.setFont("helvetica", "normal");
      pdf.text("Subtotal", pageWidth - margin - 140, currentY + 40, { align: "right" });
      pdf.text(`NPR ${formatCurrency(invoice.subtotal)}`, pageWidth - margin - 18, currentY + 40, { align: "right" });

      if (invoice.discount > 0) {
        pdf.setTextColor(239, 68, 68);
        pdf.text("Discount", pageWidth - margin - 140, currentY + 58, { align: "right" });
        pdf.text(`- NPR ${formatCurrency(invoice.discount)}`, pageWidth - margin - 18, currentY + 58, { align: "right" });
      }

      pdf.setFillColor(15, 23, 42);
      pdf.roundedRect(pageWidth - margin - 196, currentY + 90, 188, 28, 6, 6, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("TOTAL DUE", pageWidth - margin - 176, currentY + 109);
      pdf.text(`NPR ${formatCurrency(invoice.totalAmount)}`, pageWidth - margin - 18, currentY + 109, { align: "right" });

      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("Young Explorers Academy — Baluwatar, Kathmandu, Nepal", margin, pageHeight - 64);

      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(pageWidth - margin - 174, pageHeight - 82, 174, 30, 8, 8, "F");
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.text("THANK YOU FOR CHOOSING US!", pageWidth - margin - 158, pageHeight - 62);

      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "normal");
      pdf.text("This is a computer-generated invoice. No signature required.", margin, pageHeight - 32);
      pdf.text("info@youngexplorers.edu.np", pageWidth - margin - 150, pageHeight - 32, { align: "right" });
      pdf.text("www.youngexplorers.edu.np", pageWidth - margin - 150, pageHeight - 18, { align: "right" });

      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      console.error("Failed to export invoice PDF:", err);
    } finally {
      setExportingInvoicePdf(false);
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
        discount,
        invoiceDate,
        dueDate,
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px_220px_180px]">

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
                Billing Month (BS)
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
                Nepali month format: YYYY-MM.
              </p>
            </div>

            <div>
              <label
                htmlFor="invoiceDate"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Invoice Date (BS)
              </label>

              <input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 px-4 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="dueDate"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Due Date (BS)
              </label>

              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 px-4 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                className="w-full rounded-xl border border-slate-300 bg-white py-3 px-4 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="0"
              />
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
              onView={(invoice) => setSelectedInvoiceForPreview(invoice)}
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

      {selectedInvoiceForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Invoice Preview
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownloadInvoicePdf()}
                  disabled={exportingInvoicePdf}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportingInvoicePdf ? "Preparing..." : "Download PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPreview(null)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div ref={invoicePreviewRef} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <img src={yeaLogo} alt="Young Explorers Academy" className="h-16 w-auto rounded-xl border border-slate-200 bg-slate-50 p-2" />
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{ORGANIZATION_DETAILS.name}</h3>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{ORGANIZATION_DETAILS.tagline}</p>
                    <p className="mt-1 text-xs text-slate-500">{ORGANIZATION_DETAILS.address}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-900">Phone:</span> {ORGANIZATION_DETAILS.phone}</p>
                  <p><span className="font-semibold text-slate-900">Email:</span> {ORGANIZATION_DETAILS.email}</p>
                  <p><span className="font-semibold text-slate-900">Website:</span> {ORGANIZATION_DETAILS.website}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Invoice To</p>
                  <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">
                      {invoiceCustomer?.guardianName || invoiceCustomer?.parentName || "Parent / Guardian"}
                    </p>
                    <p className="mt-1 text-slate-600">Student: {invoiceCustomer?.fullName || selectedInvoiceForPreview.studentName}</p>
                    <p className="mt-1 text-slate-500">Student Code: {selectedInvoiceForPreview.studentCode}</p>
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Invoice Details</p>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <p><span className="font-medium">Invoice #:</span> {selectedInvoiceForPreview.invoiceNumber}</p>
                    <p><span className="font-medium">Issue Date:</span> {selectedInvoiceForPreview.invoiceDate}</p>
                    <p><span className="font-medium">Due Date:</span> {selectedInvoiceForPreview.dueDate || "—"}</p>
                    <p><span className="font-medium">Billing Month:</span> {selectedInvoiceForPreview.billingMonth}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Activity</th>
                      <th className="px-4 py-3 font-semibold">Sessions</th>
                      <th className="px-4 py-3 font-semibold text-right">Session Fee</th>
                      <th className="px-4 py-3 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {selectedInvoiceForPreview.lines.map((line, index) => (
                      <tr key={`${line.activityName}-${index}`}>
                        <td className="px-4 py-3 text-slate-700">{line.activityName}</td>
                        <td className="px-4 py-3 text-slate-700">{line.sessionCount} / {line.expectedSessions}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(line.sessionFee)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 ml-auto max-w-md space-y-2 text-sm text-slate-700">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(selectedInvoiceForPreview.subtotal)}</span></div>
                {selectedInvoiceForPreview.discount > 0 && (
                  <div className="flex justify-between text-red-600"><span>Discount</span><span>-{formatCurrency(selectedInvoiceForPreview.discount)}</span></div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900"><span>Total Due</span><span>{formatCurrency(selectedInvoiceForPreview.totalAmount)}</span></div>
              </div>

              {selectedInvoiceForPreview.notes && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <span className="font-semibold">Notes:</span> {selectedInvoiceForPreview.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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