import jsPDF from "jspdf";
import { formatBSDate } from "@/utils/nepali-date";
import {
  INVOICE_COLORS as color,
  INVOICE_PAYMENT_ACCOUNT,
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
  // Reserve the legal notice and the highest point of the footer wave.
  const bottom = height - 170;
  const continuationTop = 200;

  const logo = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/yea-logo.png";
  });

  const paymentQr = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load the payment QR image."));
    img.src = INVOICE_PAYMENT_ACCOUNT.qrImage;
  });
  const qrWidth = 180;
  const qrHeight = qrWidth * paymentQr.naturalHeight / paymentQr.naturalWidth;

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

  function page() {
    pdf.setFillColor(color.paper);
    pdf.rect(0, 0, width, height, "F");
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
  }

  function nextPage() {
    pdf.addPage();
    page();
    return continuationTop;
  }

  page();
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
    const fullRowHeight = Math.max(32, lineCount * 12 + 18);
    // Keep a row intact when it fits on a fresh page. Exceptionally long
    // descriptions can still continue across pages without losing text.
    if (y + fullRowHeight > bottom && fullRowHeight <= bottom - continuationTop - 30) {
      y = nextPage();
      tableHead();
    }
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
  const summaryHeight = Math.max(totalRows.length * 25 + 58, 134 + qrHeight);
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

  const paymentWidth = 240;
  const paymentHeight = 134 + qrHeight;
  pdf.setFillColor(color.tint);
  pdf.setDrawColor(color.border);
  pdf.roundedRect(margin, summaryY, paymentWidth, paymentHeight, 7, 7, "FD");
  text("PAYMENT INFORMATION", margin + 12, summaryY + 20, 8, color.blue, true);
  text("ACCOUNT NAME", margin + 12, summaryY + 38, 7, color.muted);
  text(INVOICE_PAYMENT_ACCOUNT.name, margin + 12, summaryY + 51, 9, color.ink, true);
  text("ACCOUNT NUMBER", margin + 12, summaryY + 68, 7, color.muted);
  text(INVOICE_PAYMENT_ACCOUNT.number, margin + 12, summaryY + 81, 9, color.ink, true);
  pdf.addImage(paymentQr, "JPEG", margin + 30, summaryY + 91, qrWidth, qrHeight);
  const buttonY = summaryY + 101 + qrHeight;
  pdf.setFillColor(color.blue);
  pdf.roundedRect(margin + 30, buttonY, qrWidth, 24, 4, 4, "F");
  text("Save QR", margin + 30 + qrWidth / 2, buttonY + 16, 9, "#ffffff", true, "center");
  // A hosted download page works after the PDF is saved or shared to another device.
  pdf.link(margin + 30, buttonY, qrWidth, 24, {
    url: new URL("/save-qr.html", window.location.origin).href,
  });

  const pages = pdf.getNumberOfPages();
  for (let number = 1; number <= pages; number++) {
    pdf.setPage(number);
    const footerHeight = 112.5;
    const top = height - footerHeight;
    const sx = width / 794;
    const sy = footerHeight / 150;
    const footer = (offset: number, fill: string) => {
      pdf.setFillColor(fill);
      pdf.path([
        { op: "m", c: [0, top + (66 + offset) * sy] },
        { op: "c", c: [170 * sx, top + (-30 + offset) * sy, 286 * sx, top + (36 + offset) * sy, 422 * sx, top + (50 + offset) * sy] },
        { op: "c", c: [592 * sx, top + (78 + offset) * sy, 649 * sx, top + (-15 + offset) * sy, width, top + (8 + offset) * sy] },
        { op: "l", c: [width, height] }, { op: "l", c: [0, height] }, { op: "h", c: [] },
      ]).fill();
    };
    text("Computer-generated invoice - No signature required", margin, bottom + 19, 7, color.muted);
    footer(0, color.yellow);
    footer(8, color.blue);

    // Small vector contact icons stay sharp when the PDF is printed.
    function icon(kind: "phone" | "mail" | "globe" | "pin", x: number, y: number) {
      pdf.setDrawColor(color.yellow);
      pdf.setLineWidth(1);
      if (kind === "mail") {
        pdf.rect(x, y, 9, 7);
        pdf.line(x, y, x + 4.5, y + 4);
        pdf.line(x + 4.5, y + 4, x + 9, y);
      } else if (kind === "globe") {
        pdf.circle(x + 4.5, y + 4, 4.5);
        pdf.ellipse(x + 4.5, y + 4, 2, 4.5);
        pdf.line(x, y + 4, x + 9, y + 4);
      } else if (kind === "pin") {
        pdf.circle(x + 4.5, y + 3, 4);
        pdf.circle(x + 4.5, y + 3, 1.3);
        pdf.line(x + 1, y + 5, x + 4.5, y + 11);
        pdf.line(x + 8, y + 5, x + 4.5, y + 11);
      } else {
        pdf.path([
          { op: "m", c: [x + 1, y] }, { op: "l", c: [x + 3, y] },
          { op: "l", c: [x + 4, y + 3] }, { op: "l", c: [x + 2.5, y + 4] },
          { op: "c", c: [x + 3, y + 6, x + 5, y + 7, x + 6, y + 7] },
          { op: "l", c: [x + 7, y + 5.5] }, { op: "l", c: [x + 10, y + 7] },
          { op: "l", c: [x + 10, y + 9] },
          { op: "c", c: [x + 3, y + 11, x - 1, y + 4, x + 1, y] },
        ]).stroke();
      }
    }
    const contactY = top + 63;
    [organization.phone, organization.email, organization.website].forEach((value, index) => {
      icon((["phone", "mail", "globe"] as const)[index], margin, contactY + index * 14 - 7);
      text(value, margin + 18, contactY + index * 14, 8, "#ffffff");
    });
    icon("pin", 339, contactY + 7);
    text(wrap(organization.name, right - 357, 8), 357, contactY + 14, 8, "#ffffff", true);
    text(wrap(organization.address, right - 357, 7), 357, contactY + 31, 7, "#ffffff");
    text(`Page ${number} of ${pages}`, right, height - 8, 6, "#ffffff", false, "right");
  }
  return pdf;
}
