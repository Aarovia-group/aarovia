// PDF Generation Service using HTML → PDF approach
// Uses puppeteer-core or @react-pdf/renderer compatible output
// For Vercel deployment we generate HTML and let the client handle PDF

const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character] as string))

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
    <strong>Aarovia Real Estates</strong> &nbsp;|&nbsp; aarovia.co.in &nbsp;|&nbsp; RERA Approved<br>
    <span style="font-size:10px;margin-top:4px;display:block">This is a computer-generated quotation. For queries, contact your sales executive.</span>
  </div>
</div>
</body>
</html>`
}

export const generateInvoiceHTML = (invoice: any, booking: any, autoPrint = false): string => {
  const fmt = (value: number) => `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtDate = (value?: string | Date | null) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const text = (value: unknown) => escapeHtml(value || '—')
  const customer = booking.customer || {}
  const inventory = booking.inventory || {}
  const project = inventory.project || booking.quotation?.project || {}
  const quotation = booking.quotation || {}
  const salesperson = booking.lead?.assignedTo || {}
  const companyName = process.env.COMPANY_NAME || 'Aarovia Real Estates'
  const companyAddress = process.env.COMPANY_ADDRESS || 'Hyderabad, Telangana'
  const companyPhone = process.env.COMPANY_PHONE || ''
  const companyEmail = process.env.COMPANY_EMAIL || ''
  const companyGstin = process.env.COMPANY_GSTIN || ''
  const area = Number(inventory.area || quotation.area || 0)
  const gstRate = Number.isFinite(Number(invoice.gstRate))
    ? Number(invoice.gstRate)
    : (invoice.amount > 0 ? Number(invoice.gstAmount || 0) / Number(invoice.amount) * 100 : 0)
  const priceRows = [
    ['Base amount', quotation.baseAmount],
    ['Floor rise charges', quotation.floorRise],
    ['PLC charges', quotation.plcCharges],
    ['Maintenance charges', quotation.maintenanceCharges],
    ['Parking charges', quotation.parkingCharges],
    ['Clubhouse charges', quotation.clubhouseCharges],
    ['Legal & documentation', quotation.legalCharges],
    ['Discount', quotation.discount ? -Number(quotation.discount) : 0],
  ].filter(([, amount]) => Number(amount) !== 0)
  const address = [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')
  const autoPrintScript = autoPrint ? '<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),300))</script>' : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invoice ${text(invoice.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f1f5f9; color: #172033; font: 13px/1.5 Arial, sans-serif; }
    .toolbar { position: sticky; top: 0; display: flex; justify-content: flex-end; gap: 10px; padding: 12px max(20px,calc((100vw - 820px)/2)); background: #fff; border-bottom: 1px solid #d8e0e8; }
    .toolbar button { border: 0; border-radius: 6px; padding: 10px 16px; background: #b27a16; color: #fff; font-weight: 700; cursor: pointer; }
    .page { max-width: 820px; min-height: 1050px; margin: 24px auto; padding: 42px 48px; background: #fff; box-shadow: 0 2px 16px #0f172a14; }
    .header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 24px; border-bottom: 3px solid #c9a84c; }
    .brand { font: 700 25px Georgia,serif; letter-spacing: 1px; }
    .brand-sub { color: #64748b; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
    .invoice-title { color: #b27a16; font-size: 30px; font-weight: 800; text-align: right; }
    .invoice-meta { margin-top: 8px; color: #64748b; text-align: right; line-height: 1.8; }
    .section-title { margin: 26px 0 10px; padding-bottom: 7px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
    .label { margin-bottom: 5px; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .7px; }
    .strong { font-size: 14px; font-weight: 700; }
    .muted { color: #475569; font-size: 12px; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { padding: 10px; background: #f1f5f9; color: #475569; font-size: 10px; text-align: left; text-transform: uppercase; }
    td { padding: 9px 10px; border-bottom: 1px solid #edf0f3; }
    .right { text-align: right; white-space: nowrap; }
    .total td { border-top: 2px solid #c9a84c; background: #fbf8f0; font-size: 15px; font-weight: 700; }
    .total td:last-child { color: #9a6812; }
    .pill { display: inline-block; padding: 4px 10px; border-radius: 12px; background: #f1f5f9; font-size: 10px; font-weight: 700; }
    .footer { margin-top: 34px; padding-top: 14px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 10px; text-align: center; }
    @media (max-width: 640px) { .page { margin: 0; padding: 24px 18px; } .grid { grid-template-columns: 1fr; gap: 18px; } .header { gap: 10px; } .invoice-title { font-size: 24px; } }
    @media print { body { background: #fff; } .toolbar { display: none; } .page { max-width: none; min-height: 0; margin: 0; padding: 20mm 16mm; box-shadow: none; } }
  </style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="window.print()">Download PDF / Print</button></div>
  <main class="page">
    <header class="header">
      <div>
        <div class="brand">${text(companyName).toUpperCase()}</div>
        <div class="brand-sub">Real Estates</div>
        <div class="muted" style="margin-top:12px">${text(companyAddress)}<br>${companyPhone ? `Phone: ${text(companyPhone)}<br>` : ''}${companyEmail ? `Email: ${text(companyEmail)}<br>` : ''}${companyGstin ? `GSTIN: ${text(companyGstin)}<br>` : ''}aarovia.co.in</div>
      </div>
      <div>
        <div class="invoice-title">TAX INVOICE</div>
        <div class="invoice-meta"><strong>${text(invoice.invoiceNumber)}</strong><br>Date: ${fmtDate(invoice.createdAt)}<br>Due date: ${fmtDate(invoice.dueDate)}<br><span class="pill">${text(String(invoice.status).replace(/_/g, ' '))}</span></div>
      </div>
    </header>

    <section class="grid">
      <div>
        <div class="section-title">Bill to</div>
        <div class="strong">${text(customer.name)}</div>
        <div class="muted">Phone: ${text(customer.mobile)}</div>
        <div class="muted">Email: ${text(customer.email)}</div>
        <div class="muted">Address: ${text(address)}</div>
      </div>
      <div>
        <div class="section-title">Developer / project</div>
        <div class="strong">${text(project.name || companyName)}</div>
        <div class="muted">Developer: ${text(companyName)}</div>
        <div class="muted">Project location: ${text([project.location, project.city, project.state].filter(Boolean).join(', '))}</div>
        <div class="muted">RERA registration: ${text(project.reraNumber)}</div>
      </div>
    </section>

    <section class="grid">
      <div>
        <div class="section-title">Property details</div>
        <div class="strong">${text(project.name || 'Property')} — Unit ${text(inventory.unitNumber)}</div>
        <div class="muted">Booking: ${text(booking.bookingNumber)}</div>
        <div class="muted">Property type: ${text(inventory.propertyType || quotation.propertyType)}</div>
        <div class="muted">Area: ${area ? `${escapeHtml(area.toLocaleString('en-IN'))} sq.ft` : '—'}</div>
        <div class="muted">Configuration: ${inventory.bedrooms ? `${escapeHtml(inventory.bedrooms)} BHK` : '—'}${inventory.bathrooms ? ` · ${escapeHtml(inventory.bathrooms)} bathrooms` : ''}</div>
        <div class="muted">Floor / tower: ${text(inventory.floor)} / ${text(inventory.tower)}</div>
      </div>
      <div>
        <div class="section-title">Sales contact</div>
        <div class="strong">${text(salesperson.name)}</div>
        <div class="muted">Phone: ${text(salesperson.phone)}</div>
        <div class="muted">Email: ${text(salesperson.email)}</div>
      </div>
    </section>

    ${quotation.id ? `<section><div class="section-title">Property price details${quotation.quotationNumber ? ` · Quotation ${text(quotation.quotationNumber)}` : ''}</div>
      <table><thead><tr><th>Description</th><th class="right">Amount</th></tr></thead><tbody>
      <tr><td>Area × base rate (${area ? `${escapeHtml(area.toLocaleString('en-IN'))} sq.ft` : 'area'} × ${fmt(quotation.baseRate || 0)}/sq.ft)</td><td class="right">${fmt(quotation.baseAmount || 0)}</td></tr>
      ${priceRows.slice(1).map(([label, amount]) => `<tr><td>${escapeHtml(label)}</td><td class="right">${fmt(Number(amount))}</td></tr>`).join('')}
      <tr><td>Quoted subtotal (before GST)</td><td class="right">${fmt(Number(quotation.totalAmount || 0) - Number(quotation.gstAmount || 0))}</td></tr>
      </tbody></table></section>` : ''}

    <section>
      <div class="section-title">Invoice charges</div>
      <table><thead><tr><th>Description</th><th class="right">Amount</th></tr></thead><tbody>
        <tr><td>${text(project.name || 'Property')} — Unit ${text(inventory.unitNumber)}${area ? ` (${escapeHtml(area.toLocaleString('en-IN'))} sq.ft)` : ''}</td><td class="right">${fmt(invoice.amount)}</td></tr>
        <tr><td>GST @ ${escapeHtml(gstRate)}%</td><td class="right">${fmt(invoice.gstAmount)}</td></tr>
        <tr class="total"><td>Total payable</td><td class="right">${fmt(invoice.totalAmount)}</td></tr>
      </tbody></table>
      <div class="muted">Booking value: ${fmt(booking.totalAmount)} · Received: ${fmt(booking.collectedAmount)} · Booking balance: ${fmt(booking.dueAmount)}</div>
    </section>

    ${invoice.notes ? `<section><div class="section-title">Notes / payment terms</div><div class="muted">${text(invoice.notes).replace(/\r?\n/g, '<br>')}</div></section>` : ''}
    <footer class="footer">Thank you for choosing ${text(companyName)} · This is a computer-generated invoice.</footer>
  </main>
  ${autoPrintScript}
</body>
</html>`
}
