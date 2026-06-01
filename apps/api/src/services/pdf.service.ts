// PDF Generation Service using HTML → PDF approach
// Uses puppeteer-core or @react-pdf/renderer compatible output
// For Vercel deployment we generate HTML and let the client handle PDF

export const generateQuotationHTML = (quotation: any): string => {
  const fmt = (n: number) => `₹${n?.toLocaleString('en-IN') || '0'}`
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; font-size: 13px; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { background: linear-gradient(135deg, #0A1628, #1E3559); color: #fff; padding: 30px 40px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center; }
    .logo-text { font-size: 28px; font-weight: 700; color: #C9A84C; letter-spacing: 2px; }
    .logo-sub { font-size: 10px; color: #8BA3C4; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px; }
    .quotation-badge { background: rgba(201,168,76,0.2); border: 1px solid #C9A84C; color: #C9A84C; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .body { padding: 30px 40px; border: 1px solid #e5e7eb; border-top: none; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb; }
    .meta-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .meta-value { font-size: 14px; color: #1a1a2e; font-weight: 600; }
    .section-title { font-size: 13px; font-weight: 700; color: #0A1628; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #C9A84C; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f9fafb; padding: 10px 14px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
    td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .amount { text-align: right; font-weight: 600; }
    .total-row td { background: #f9f6f0; font-weight: 700; font-size: 15px; border-top: 2px solid #C9A84C; }
    .total-row td:last-child { color: #C9A84C; font-size: 18px; }
    .footer { background: #0A1628; color: #8BA3C4; padding: 20px 40px; text-align: center; font-size: 11px; border-radius: 0 0 12px 12px; }
    .footer strong { color: #C9A84C; }
    .terms { background: #f9fafb; border-left: 3px solid #C9A84C; padding: 14px 16px; margin-bottom: 24px; font-size: 12px; color: #4b5563; line-height: 1.6; }
    .badge { display: inline-block; background: #C9A84C; color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo-text">AAROVIA</div>
      <div class="logo-sub">Real Estates</div>
    </div>
    <div style="text-align:right">
      <div class="quotation-badge">QUOTATION</div>
      <div style="color:#8BA3C4; font-size:12px; margin-top:8px">#${quotation.quotationNumber}</div>
    </div>
  </div>

  <div class="body">
    <div class="meta-grid">
      <div>
        <div class="meta-label">Prepared For</div>
        <div class="meta-value">${quotation.lead?.name || 'Valued Customer'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">${quotation.lead?.mobile || ''}</div>
        <div style="font-size:12px;color:#6b7280">${quotation.lead?.email || ''}</div>
      </div>
      <div>
        <div class="meta-label">Project</div>
        <div class="meta-value">${quotation.project?.name || 'Aarovia Real Estates'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">Unit: ${quotation.inventory?.unitNumber || 'TBD'}</div>
        <div style="font-size:12px;color:#6b7280">Valid Until: ${fmtDate(quotation.validUntil)}</div>
      </div>
    </div>

    <div class="section-title">Property Details</div>
    <table>
      <tr><th>Description</th><th style="text-align:right">Details</th></tr>
      <tr><td>Property Type</td><td class="amount">${quotation.propertyType}</td></tr>
      <tr><td>Area</td><td class="amount">${quotation.area} sq.ft</td></tr>
      <tr><td>Base Rate</td><td class="amount">₹${quotation.baseRate?.toLocaleString('en-IN')}/sq.ft</td></tr>
    </table>

    <div class="section-title">Price Breakdown</div>
    <table>
      <tr><th>Component</th><th style="text-align:right">Amount</th></tr>
      <tr><td>Base Amount (${quotation.area} sq.ft × ₹${quotation.baseRate?.toLocaleString('en-IN')})</td><td class="amount">${fmt(quotation.baseAmount)}</td></tr>
      ${quotation.floorRise > 0 ? `<tr><td>Floor Rise Charges</td><td class="amount">${fmt(quotation.floorRise)}</td></tr>` : ''}
      ${quotation.plcCharges > 0 ? `<tr><td>PLC Charges</td><td class="amount">${fmt(quotation.plcCharges)}</td></tr>` : ''}
      ${quotation.maintenanceCharges > 0 ? `<tr><td>Maintenance Charges</td><td class="amount">${fmt(quotation.maintenanceCharges)}</td></tr>` : ''}
      ${quotation.parkingCharges > 0 ? `<tr><td>Parking Charges</td><td class="amount">${fmt(quotation.parkingCharges)}</td></tr>` : ''}
      ${quotation.clubhouseCharges > 0 ? `<tr><td>Clubhouse Charges</td><td class="amount">${fmt(quotation.clubhouseCharges)}</td></tr>` : ''}
      ${quotation.legalCharges > 0 ? `<tr><td>Legal & Documentation</td><td class="amount">${fmt(quotation.legalCharges)}</td></tr>` : ''}
      ${quotation.discount > 0 ? `<tr><td style="color:#dc2626">Discount</td><td class="amount" style="color:#dc2626">- ${fmt(quotation.discount)}</td></tr>` : ''}
      <tr><td>GST @ ${quotation.gstRate}%</td><td class="amount">${fmt(quotation.gstAmount)}</td></tr>
      <tr class="total-row"><td>TOTAL PAYABLE AMOUNT</td><td class="amount">${fmt(quotation.totalAmount)}</td></tr>
    </table>

    ${quotation.bookingAmount > 0 ? `
    <div class="section-title">Payment Summary</div>
    <table>
      <tr><th>Milestone</th><th style="text-align:right">Amount</th></tr>
      <tr><td>Booking Amount (On Booking)</td><td class="amount" style="color:#16a34a">${fmt(quotation.bookingAmount)}</td></tr>
      <tr><td>Balance Payable</td><td class="amount">${fmt(quotation.totalAmount - quotation.bookingAmount)}</td></tr>
    </table>` : ''}

    ${quotation.notes ? `
    <div class="section-title">Terms & Conditions</div>
    <div class="terms">${quotation.notes}</div>` : `
    <div class="section-title">Terms & Conditions</div>
    <div class="terms">
      1. This quotation is valid for 30 days from the date of issue.<br>
      2. Prices are subject to change without prior notice.<br>
      3. GST as applicable will be charged at actuals.<br>
      4. Booking amount to be paid by cheque/NEFT/RTGS in favour of Aarovia Real Estates.<br>
      5. All disputes subject to Hyderabad jurisdiction only.
    </div>`}
  </div>

  <div class="footer">
    <strong>Aarovia Real Estates</strong> &nbsp;|&nbsp; crm.aarovia.co.in &nbsp;|&nbsp; RERA Approved<br>
    <span style="font-size:10px;margin-top:4px;display:block">This is a computer-generated quotation. For queries, contact your sales executive.</span>
  </div>
</div>
</body>
</html>`
}

export const generateInvoiceHTML = (invoice: any, booking: any): string => {
  const fmt = (n: number) => `₹${n?.toLocaleString('en-IN') || '0'}`
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN') : '—'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; font-size: 13px; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #C9A84C; }
    .brand { font-size: 24px; font-weight: 800; color: #0A1628; }
    .brand-sub { font-size: 10px; color: #9ca3af; letter-spacing: 2px; text-transform: uppercase; }
    .invoice-title { font-size: 32px; font-weight: 800; color: #C9A84C; text-align: right; }
    .invoice-no { font-size: 12px; color: #6b7280; text-align: right; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0 24px; }
    th { background: #0A1628; color: #C9A84C; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; }
    .total-row td { background: #f9f6f0; font-weight: 700; border-top: 2px solid #C9A84C; }
    .footer-note { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">AAROVIA</div>
      <div class="brand-sub">Real Estates</div>
      <div style="margin-top:16px;font-size:12px;color:#4b5563;">
        Hyderabad, Telangana<br>
        GSTIN: 36AAAAA0000A1ZA<br>
        crm.aarovia.co.in
      </div>
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-no">${invoice.invoiceNumber}</div>
      <div style="font-size:12px;color:#6b7280;text-align:right;margin-top:8px;">
        Date: ${fmtDate(invoice.createdAt)}<br>
        Due: ${fmtDate(invoice.dueDate)}
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
    <div>
      <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Bill To</div>
      <div style="font-weight:700;font-size:15px;">${booking.customer?.name}</div>
      <div style="color:#4b5563;font-size:12px;margin-top:2px;">${booking.customer?.mobile}</div>
      <div style="color:#4b5563;font-size:12px;">${booking.customer?.email || ''}</div>
    </div>
    <div>
      <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Property Details</div>
      <div style="font-weight:700;font-size:13px;">Unit ${booking.inventory?.unitNumber}</div>
      <div style="color:#4b5563;font-size:12px;margin-top:2px;">Booking: ${booking.bookingNumber}</div>
    </div>
  </div>

  <table>
    <tr>
      <th>Description</th>
      <th style="text-align:right">Amount</th>
    </tr>
    <tr>
      <td>Property Payment — Unit ${booking.inventory?.unitNumber}</td>
      <td style="text-align:right">${fmt(invoice.amount)}</td>
    </tr>
    <tr>
      <td>GST @ ${invoice.gstAmount > 0 ? ((invoice.gstAmount / invoice.amount) * 100).toFixed(0) : 0}%</td>
      <td style="text-align:right">${fmt(invoice.gstAmount)}</td>
    </tr>
    <tr class="total-row">
      <td>TOTAL</td>
      <td style="text-align:right;font-size:16px;color:#C9A84C;">${fmt(invoice.totalAmount)}</td>
    </tr>
  </table>

  <div style="background:#f9fafb;border-left:3px solid #C9A84C;padding:14px;font-size:12px;color:#4b5563;">
    <strong>Payment Instructions:</strong> Pay by NEFT/RTGS/Cheque in favour of <strong>Aarovia Real Estates</strong>.
    Please mention your booking number as reference.
  </div>

  <div class="footer-note">
    Thank you for choosing Aarovia Real Estates · This is a computer-generated invoice
  </div>
</div>
</body>
</html>`
}
