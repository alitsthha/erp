import jsPDF from "jspdf";
import { formatBSDate } from "@/utils/nepali-date";
import {
  INVOICE_COLORS as color,
  INVOICE_PAYMENT_NOTE,
  INVOICE_THANK_YOU,
  invoiceMoney,
  billingLineQuantity,
  billingLineDetail,
  billingLineRate,
  invoiceRecipient,
  type InvoiceDocumentProps,
} from "../components/invoice-document";

/** Vector text and curves keep exported invoices sharp and searchable. */
export async function buildInvoicePdf(props: InvoiceDocumentProps): Promise<jsPDF> {
  const { invoice, organization, pan } = props;
  const recipient = invoiceRecipient(props);
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const right = width - margin;
  const contentWidth = right - margin;
  const bottom = height - 120;

  const logo = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/yea-logo.png";
  });

  function text(value: string | string[], x: number, y: number, size = 9, ink = color.ink, bold = false, align: "left" | "right" | "center" = "left") {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(ink);
    pdf.text(value, x, y, { align, lineHeightFactor: 1.5 });
  }

  function wrap(value: string, maxWidth: number, size = 9): string[] {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    return pdf.splitTextToSize(value, maxWidth);
  }

  function headerCurve(offset: number, fill: string) {
    const s = width / 794;
    pdf.setFillColor(fill);
    pdf.path([
      { op: "m", c: [0, 0] }, { op: "l", c: [width, 0] },
      { op: "l", c: [width, (8 + offset) * s] },
      { op: "c", c: [689 * s, (106 + offset) * s, 598 * s, (41 + offset) * s, 496 * s, (70 + offset) * s] },
      { op: "c", c: [367 * s, (106 + offset) * s, 374 * s, (247 + offset) * s, 196 * s, (238 + offset) * s] },
      { op: "c", c: [116 * s, (236 + offset) * s, 58 * s, (225 + offset) * s, 0, (217 + offset) * s] },
      { op: "h", c: [] },
    ]).fill();
  }

  function page(first = false) {
    pdf.setFillColor(color.paper);
    pdf.rect(0, 0, width, height, "F");
    if (first) {
      headerCurve(12, color.yellow);
      headerCurve(0, color.blue);
      pdf.setFillColor("#ffffff");
      pdf.roundedRect(margin, 27, 224, 88, 3, 3, "F");
      if (logo) {
        const logoWidth = 200;
        pdf.addImage(logo, "PNG", margin + 12, 36, logoWidth, logoWidth * logo.naturalHeight / logo.naturalWidth);
      } else {
        text(wrap(organization.name, 198, 17), margin + 12, 56, 17, color.blue, true);
      }
      text(organization.tagline, margin, 132, 7, "#ffffff");
      text("STUDENT FEES", right, 126, 7, color.muted, false, "right");
      text("INVOICE", right, 154, 28, color.navy, true, "right");
      text(invoice.status, right, 174, 9, invoice.status === "Paid" ? "#206635" : color.blue, true, "right");
    } else {
      pdf.setFillColor(color.blue);
      pdf.rect(0, 0, width, 7, "F");
      text(organization.name, margin, 36, 11, color.blue, true);
      text(invoice.invoiceNumber, right, 36, 9, color.muted, false, "right");
    }
  }

  function nextPage() {
    pdf.addPage();
    page();
    return 62;
  }

  page(true);
  text("BILL TO", margin, 200, 8, color.blue, true);
  let recipientY = 220;
  const recipientLines = [recipient.name, recipient.student, `Student code: ${invoice.studentCode}`, recipient.address, recipient.phone, recipient.email].filter((value): value is string => Boolean(value));
  recipientLines.forEach((value, index) => {
    const lines = wrap(value, 240, index === 0 ? 11 : 8);
    text(lines, margin, recipientY, index === 0 ? 11 : 8, index === 0 ? color.ink : color.muted, index === 0);
    recipientY += lines.length * (index === 0 ? 16.5 : 12) + 1;
  });
  const metadata = [
    ["INVOICE NO.", invoice.invoiceNumber],
    ["ISSUE DATE", formatBSDate(invoice.invoiceDate)],
    [invoice.billingDate ? "CHARGES THROUGH" : "BILLING MONTH", invoice.billingDate ? formatBSDate(invoice.billingDate) : `${invoice.billingMonth} BS`],
    ...(invoice.dueDate ? [["DUE DATE", formatBSDate(invoice.dueDate)]] : []),
    ...(pan ? [["PAN", pan]] : []),
  ];
  let metadataY = 201;
  metadata.forEach(([label, value]) => {
    const lines = wrap(value, 145, 9);
    text(label, 319, metadataY, 7, color.ink);
    text(lines, right, metadataY, 9, color.ink, false, "right");
    metadataY += Math.max(21, lines.length * 13.5 + 7);
  });

  let y = Math.max(recipientY, metadataY) + 14;
  const edges = [margin, margin + 35, margin + 200, margin + 296, margin + 404, right];
  function tableHead() {
    pdf.setFillColor(color.blue);
    pdf.roundedRect(margin, y, contentWidth, 30, 5, 5, "F");
    ["NO.", "ACTIVITY", "SESSIONS / PERIOD", "RATE", "AMOUNT"].forEach((label, index) => {
      const x = index >= 3 ? edges[index + 1] - 10 : edges[index] + 9;
      text(label, x, y + 19, 7, index === 0 ? color.yellow : "#ffffff", true, index >= 3 ? "right" : "left");
    });
    y += 30;
  }
  if (y + 60 > bottom) y = nextPage();
  tableHead();
  invoice.lines.forEach((line, index) => {
    const values = [String(index + 1).padStart(2, "0"), `${line.activityName}\n${billingLineDetail(line)}`, billingLineQuantity(line), invoiceMoney(billingLineRate(line)), invoiceMoney(line.amount)];
    const cells = values.map((value, column) => wrap(value, edges[column + 1] - edges[column] - 20, 8));
    let offset = 0;
    const lineCount = Math.max(...cells.map((cell) => cell.length));
    while (offset < lineCount) {
      if (y + 32 > bottom) { y = nextPage(); tableHead(); }
      const count = Math.min(lineCount - offset, Math.max(1, Math.floor((bottom - y - 18) / 12)));
      const rowHeight = Math.max(32, count * 12 + 18);
      pdf.setFillColor(index % 2 ? "#f5f7f4" : color.paper);
      pdf.setDrawColor(color.border);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, y, contentWidth, rowHeight, "FD");
      cells.forEach((cell, column) => {
        if (column > 0) pdf.line(edges[column], y, edges[column], y + rowHeight);
        const x = column >= 3 ? edges[column + 1] - 10 : edges[column] + 9;
        text(cell.slice(offset, offset + count), x, y + 20, 8, color.ink, column === 4, column >= 3 ? "right" : "left");
      });
      y += rowHeight;
      offset += count;
    }
  });
  y += 20;
  const totalRows: [string, string][] = [
    ["Subtotal", invoiceMoney(invoice.subtotal)],
    ...(invoice.discount > 0 ? [["Discount", `- ${invoiceMoney(invoice.discount)}`] as [string, string]] : []),
    ["Total", invoiceMoney(invoice.totalAmount)],
    ["Amount paid", invoiceMoney(invoice.paidAmount)],
    ["Balance due", invoiceMoney(invoice.dueAmount)],
  ];
  const summaryHeight = totalRows.length * 25 + 58;
  if (y + summaryHeight > bottom) y = nextPage();
  const summaryY = y;
  totalRows.forEach(([label, value], index) => {
    const balance = index === totalRows.length - 1;
    pdf.setFillColor(balance ? color.blue : color.tint);
    pdf.rect(319, y, right - 319, 25, "F");
    text(label.toUpperCase(), 331, y + 18, 7, balance ? "#fff0ad" : color.ink, label === "Total");
    text(value, right - 12, y + 18, 10, balance ? "#ffffff" : color.ink, balance || label === "Total", "right");
    y += 25;
  });
  pdf.setFont("times", "italic");
  pdf.setFontSize(27);
  pdf.setTextColor(color.blue);
  pdf.text("Thank you!", 439, y + 37, { align: "center" });
  text("FOR GROWING WITH US", 439, y + 53, 7, color.muted, false, "center");

  // Keep long notes inside the printable area, continuing onto a branded page.
  let notesY = summaryY + 11;
  const noteBlocks = [["PAYMENT INFORMATION", INVOICE_PAYMENT_NOTE], ["NOTES", invoice.notes || INVOICE_THANK_YOU]];
  noteBlocks.forEach(([heading, body]) => {
    if (notesY + 40 > bottom) notesY = nextPage();
    text(heading, margin, notesY, 8, color.blue, true);
    notesY += 19;
    for (const line of wrap(body, 240, 9)) {
      if (notesY + 14 > bottom) notesY = nextPage();
      text(line, margin, notesY, 9, color.muted);
      notesY += 13.5;
    }
    notesY += 20;
  });

  const pages = pdf.getNumberOfPages();
  for (let number = 1; number <= pages; number++) {
    pdf.setPage(number);
    const top = height - 108;
    const footer = (offset: number, fill: string) => {
      pdf.setFillColor(fill);
      pdf.path([
        { op: "m", c: [0, top + 30 + offset] },
        { op: "c", c: [130, top - 35 + offset, 224, top + 35 + offset, 335, top + 22 + offset] },
        { op: "c", c: [450, top + 12 + offset, 490, top - 30 + offset, width, top - 13 + offset] },
        { op: "l", c: [width, height] }, { op: "l", c: [0, height] }, { op: "h", c: [] },
      ]).fill();
    };
    footer(0, color.yellow);
    footer(6, color.blue);
    text(organization.phone, margin, top + 48, 8, "#ffffff");
    text(organization.email, margin, top + 62, 8, "#ffffff");
    text(organization.website, margin, top + 76, 8, "#ffffff");
    text(wrap(organization.name, 220, 8), 339, top + 48, 8, "#ffffff", true);
    text(wrap(organization.address, 220, 8), 339, top + 64, 8, "#ffffff");
    text("Computer-generated invoice - No signature required", margin, height - 10, 6, "#ffffff");
    text(`Page ${number} of ${pages}`, right, height - 10, 6, "#ffffff", false, "right");
  }
  return pdf;
}
