import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { formatBSDate } from "@/utils/nepali-date";
import yeaLogo from "/yea-logo.png";
import {
  INVOICE_PAYMENT_ACCOUNT,
  invoiceMoney,
  billingLineQuantity,
  billingLineDetail,
  billingLineRate,
  invoiceRecipient,
  type InvoiceDocumentProps,
} from "./invoice-document";
import "./invoice-document.css";

export default function InvoiceDocument(props: InvoiceDocumentProps) {
  const { invoice, organization, pan } = props;
  const recipient = invoiceRecipient(props);

  return (
    <article className="invoice-document" aria-label={`Invoice ${invoice.invoiceNumber}`}>
      <header className="invoice-document__header">
        <svg className="invoice-document__wave" viewBox="0 0 794 250" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#fecd08" d="M0 0H794V22C689 120 598 55 496 84C367 120 374 259 196 250C116 248 58 237 0 229Z" />
          <path fill="#1776bc" d="M0 0H794V8C689 106 598 41 496 70C367 106 374 247 196 238C116 236 58 225 0 217Z" />
        </svg>
        <div className="invoice-document__brand">
          <div className="invoice-document__logo"><img src={yeaLogo} alt={organization.name} /></div>
          <p>{organization.tagline}</p>
        </div>
        <div className="invoice-document__title">
          <p>Student fees</p>
          <h2>Invoice</h2>
          <span className={`invoice-document__status${invoice.status === "Paid" ? " is-paid" : ""}`}>{invoice.status}</span>
        </div>
      </header>

      <div className="invoice-document__body">
        <section className="invoice-document__details">
          <div className="invoice-document__recipient">
            <h3>Bill to</h3>
            <strong>{recipient.name}</strong>
            <p>{recipient.student}</p>
            <p className="invoice-document__muted">Student code: {invoice.studentCode}</p>
            {recipient.address && <p>{recipient.address}</p>}
            {recipient.phone && <p>{recipient.phone}</p>}
            {recipient.email && <p>{recipient.email}</p>}
          </div>
          <dl className="invoice-document__metadata">
            <div><dt>Invoice no.</dt><dd>{invoice.invoiceNumber}</dd></div>
            <div><dt>Issue date</dt><dd>{formatBSDate(invoice.invoiceDate)}</dd></div>
            <div><dt>{invoice.billingDate ? "Charges through" : "Billing month"}</dt><dd>{invoice.billingDate ? formatBSDate(invoice.billingDate) : `${invoice.billingMonth} BS`}</dd></div>
            {invoice.dueDate && <div><dt>Due date</dt><dd>{formatBSDate(invoice.dueDate)}</dd></div>}
            {pan && <div><dt>PAN</dt><dd>{pan}</dd></div>}
          </dl>
        </section>

        <div className="invoice-document__table-scroll" role="region" aria-label="Invoice line items" tabIndex={0}>
          <table className="invoice-document__table">
            <colgroup><col style={{ width: "7%" }} /><col style={{ width: "34%" }} /><col style={{ width: "15%" }} /><col style={{ width: "22%" }} /><col style={{ width: "22%" }} /></colgroup>
            <thead><tr><th scope="col">No.</th><th scope="col">Activity</th><th scope="col">Sessions / period</th><th scope="col">Rate</th><th scope="col">Amount</th></tr></thead>
            <tbody>
              {invoice.lines.map((line, index) => (
                <tr key={`${line.activityName}-${index}`}>
                  <td>{String(index + 1).padStart(2, "0")}</td>
                  <td>{line.activityName}<small style={{ display: "block" }}>{billingLineDetail(line)}</small></td>
                  <td>{billingLineQuantity(line)}</td>
                  <td>{invoiceMoney(billingLineRate(line))}</td>
                  <td>{invoiceMoney(line.amount)}</td>
                </tr>
              ))}
              {invoice.lines.length === 0 && <tr><td colSpan={5}>No line items</td></tr>}
            </tbody>
          </table>
        </div>

        <section className="invoice-document__summary">
          <div className="invoice-document__payment">
            <h3>Payment information</h3>
            <dl className="invoice-document__account">
              <div><dt>Account name</dt><dd>{INVOICE_PAYMENT_ACCOUNT.name}</dd></div>
              <div><dt>Account number</dt><dd>{INVOICE_PAYMENT_ACCOUNT.number}</dd></div>
            </dl>
            <img className="invoice-document__payment-qr" src={INVOICE_PAYMENT_ACCOUNT.qrImage} alt="Scan QR code to pay Shreeju khadka" />
            <a className="invoice-document__save-qr" href={INVOICE_PAYMENT_ACCOUNT.qrImage} download="Shreeju-khadka-payment-QR.jpeg">Save QR</a>
          </div>
          <div>
            <dl className="invoice-document__totals">
              <div><dt>Subtotal</dt><dd>{invoiceMoney(invoice.subtotal)}</dd></div>
              {invoice.discount > 0 && <div><dt>Discount</dt><dd>− {invoiceMoney(invoice.discount)}</dd></div>}
              <div className="invoice-document__total"><dt>Total</dt><dd>{invoiceMoney(invoice.totalAmount)}</dd></div>
              <div><dt>Amount paid</dt><dd>{invoiceMoney(invoice.paidAmount)}</dd></div>
              <div className="invoice-document__balance"><dt>Balance due</dt><dd>{invoiceMoney(invoice.dueAmount)}</dd></div>
            </dl>
            <div className="invoice-document__thanks"><p>Thank you!</p><span>For growing with us</span></div>
          </div>
        </section>
        <p className="invoice-document__legal">Computer-generated invoice · No signature required</p>
      </div>

      <footer className="invoice-document__footer">
        <svg className="invoice-document__wave" viewBox="0 0 794 150" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#fecd08" d="M0 66C170 -30 286 36 422 50C592 78 649 -15 794 8V150H0Z" />
          <path fill="#1776bc" d="M0 74C170 -22 286 44 422 58C592 86 649 -7 794 16V150H0Z" />
        </svg>
        <div className="invoice-document__contacts">
          <div>
            <p><Phone size={13} /><span>{organization.phone}</span></p>
            <p><Mail size={13} /><span>{organization.email}</span></p>
            <p><Globe size={13} /><span>{organization.website}</span></p>
          </div>
          <p className="invoice-document__address"><MapPin size={16} /><span><strong>{organization.name}</strong><br />{organization.address}</span></p>
        </div>
      </footer>
    </article>
  );
}
