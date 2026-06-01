import nodemailer from 'nodemailer'
import prisma from '../utils/prisma'

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export const sendProjectDetails = async (req: any, res: any) => {
  try {
    const { leadId, projectId, templateType, toEmail, toName, customMessage } = req.body

    const [lead, project] = await Promise.all([
      leadId ? prisma.lead.findUnique({ where: { id: leadId } }) : null,
      projectId ? prisma.project.findUnique({ where: { id: projectId } }) : null,
    ])

    const recipientEmail = toEmail || lead?.email
    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'No email address provided' })
    }

    const emailBody = generateProjectEmail({
      projectName: project?.name || 'Our Premium Property',
      leadName: toName || lead?.name || 'Valued Customer',
      propertyType: templateType || 'villa',
      customMessage,
      brochureUrl: project?.brochureUrl,
      images: project?.images || [],
      amenities: project?.amenities || [],
      minPrice: project?.minPrice,
      maxPrice: project?.maxPrice,
      location: project?.location,
      city: project?.city,
      senderName: req.user?.name,
    })

    const transporter = createTransporter()
    await transporter.sendMail({
      from: `"${req.user?.name} | Aarovia Real Estates" <${process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: `${project?.name || 'Premium Property'} - Project Details from Aarovia Real Estates`,
      html: emailBody,
    })

    // Log email
    if (leadId) {
      await prisma.emailLog.create({
        data: { leadId, to: recipientEmail, subject: `Project Details - ${project?.name}`, status: 'SENT' },
      })
      await prisma.activity.create({
        data: {
          leadId, userId: req.user?.id,
          type: 'EMAIL_SENT',
          description: `Project details email sent to ${recipientEmail}`,
        },
      })
    }

    res.json({ success: true, message: 'Email sent successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send email', error })
  }
}

export const sendQuotationEmail = async (req: any, res: any) => {
  try {
    const { quotationId, toEmail } = req.body
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { lead: true, project: true, inventory: true, paymentMilestones: true },
    })
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' })

    const recipientEmail = toEmail || quotation.lead?.email
    if (!recipientEmail) return res.status(400).json({ success: false, message: 'No email address' })

    const transporter = createTransporter()
    await transporter.sendMail({
      from: `"Aarovia Real Estates" <${process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: `Quotation ${quotation.quotationNumber} - Aarovia Real Estates`,
      html: generateQuotationEmail(quotation),
    })

    await prisma.quotation.update({ where: { id: quotationId }, data: { status: 'SHARED' } })
    if (quotation.leadId) {
      await prisma.emailLog.create({
        data: { leadId: quotation.leadId, to: recipientEmail, subject: `Quotation ${quotation.quotationNumber}`, status: 'SENT' },
      })
    }

    res.json({ success: true, message: 'Quotation email sent' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send quotation email', error })
  }
}

export const getEmailLogs = async (req: any, res: any) => {
  try {
    const { leadId, page = '1', limit = '20' } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where = leadId ? { leadId } : {}

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { lead: { select: { name: true } } },
      }),
      prisma.emailLog.count({ where }),
    ])

    res.json({ success: true, data: logs, meta: { total } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch email logs', error })
  }
}

const generateProjectEmail = (data: any) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#0A1628,#1E3559);padding:30px;text-align:center">
    <h1 style="color:#C9A84C;font-size:28px;margin:0;letter-spacing:2px">AAROVIA</h1>
    <p style="color:#8BA3C4;margin:5px 0 0;font-size:12px;letter-spacing:3px">REAL ESTATES</p>
  </div>
  <div style="padding:30px">
    <p style="color:#333;font-size:16px">Dear ${data.leadName},</p>
    <p style="color:#555;line-height:1.7">Thank you for your interest in ${data.projectName}. We are delighted to share the project details with you.</p>
    ${data.customMessage ? `<p style="color:#555;line-height:1.7">${data.customMessage}</p>` : ''}
    <div style="background:#f9f6f0;border-left:4px solid #C9A84C;padding:20px;margin:20px 0;border-radius:0 8px 8px 0">
      <h2 style="color:#0A1628;margin:0 0 15px;font-size:20px">${data.projectName}</h2>
      ${data.location ? `<p style="color:#666;margin:5px 0">📍 ${data.location}, ${data.city}</p>` : ''}
      ${data.minPrice ? `<p style="color:#C9A84C;font-weight:600;margin:5px 0;font-size:18px">Starting from ₹${(data.minPrice / 100000).toFixed(0)}L${data.maxPrice ? ` - ₹${(data.maxPrice / 10000000).toFixed(1)}Cr` : ''}</p>` : ''}
    </div>
    ${data.amenities.length > 0 ? `
    <div style="margin:20px 0">
      <h3 style="color:#0A1628;margin:0 0 10px">Premium Amenities</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${data.amenities.slice(0, 8).map((a: string) => `<span style="background:#f0f0f0;padding:4px 12px;border-radius:20px;font-size:13px;color:#444">✓ ${a}</span>`).join('')}
      </div>
    </div>` : ''}
    ${data.brochureUrl ? `
    <div style="text-align:center;margin:25px 0">
      <a href="${data.brochureUrl}" style="background:#C9A84C;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Download Brochure</a>
    </div>` : ''}
  </div>
  <div style="background:#0A1628;padding:20px;text-align:center">
    <p style="color:#8BA3C4;margin:0;font-size:13px">Aarovia Real Estates | crm.aarovia.co.in</p>
    <p style="color:#555;margin:5px 0 0;font-size:12px">Best Regards, ${data.senderName}</p>
  </div>
</div>
</body>
</html>`

const generateQuotationEmail = (q: any) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#fff">
  <div style="background:#0A1628;padding:25px;text-align:center">
    <h1 style="color:#C9A84C;margin:0">AAROVIA REAL ESTATES</h1>
    <p style="color:#8BA3C4;margin:5px 0 0">Quotation #${q.quotationNumber}</p>
  </div>
  <div style="padding:30px">
    <p>Dear ${q.lead?.name || 'Customer'},</p>
    <p>Please find your quotation details below:</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0">
      <tr style="background:#f9f6f0"><td style="padding:10px;border:1px solid #e0d5c0;font-weight:600">Property Type</td><td style="padding:10px;border:1px solid #e0d5c0">${q.propertyType}</td></tr>
      <tr><td style="padding:10px;border:1px solid #e0d5c0;font-weight:600">Area</td><td style="padding:10px;border:1px solid #e0d5c0">${q.area} sq.ft</td></tr>
      <tr style="background:#f9f6f0"><td style="padding:10px;border:1px solid #e0d5c0;font-weight:600">Base Amount</td><td style="padding:10px;border:1px solid #e0d5c0">₹${q.baseAmount?.toLocaleString('en-IN')}</td></tr>
      <tr><td style="padding:10px;border:1px solid #e0d5c0;font-weight:600">GST (${q.gstRate}%)</td><td style="padding:10px;border:1px solid #e0d5c0">₹${q.gstAmount?.toLocaleString('en-IN')}</td></tr>
      <tr style="background:#f9f6f0"><td style="padding:10px;border:1px solid #e0d5c0;font-weight:700;font-size:16px;color:#0A1628">Total Amount</td><td style="padding:10px;border:1px solid #e0d5c0;font-weight:700;font-size:16px;color:#C9A84C">₹${q.totalAmount?.toLocaleString('en-IN')}</td></tr>
    </table>
    <p style="color:#666;font-size:13px">This quotation is valid until ${q.validUntil ? new Date(q.validUntil).toLocaleDateString('en-IN') : '30 days from date of issue'}.</p>
  </div>
  <div style="background:#0A1628;padding:15px;text-align:center">
    <p style="color:#8BA3C4;margin:0;font-size:12px">Aarovia Real Estates | crm.aarovia.co.in</p>
  </div>
</div>
</body>
</html>`
