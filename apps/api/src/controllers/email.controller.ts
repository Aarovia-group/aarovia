import prisma from '../utils/prisma'
import { createTransporter, getCustomerFacingEmail, getSenderDisplayName } from '../utils/email'

export const sendProjectDetails = async (req: any, res: any) => {
  try {
    const { leadId, projectId, templateType, customTemplateName, templateIntro, toEmail, toName, customMessage, subject, brochureUrl, attachments = [] } = req.body

    const [lead, project] = await Promise.all([
      leadId ? prisma.lead.findUnique({ where: { id: leadId } }) : null,
      projectId ? prisma.project.findUnique({ where: { id: projectId } }) : null,
    ])

    const recipientEmail = toEmail || lead?.email
    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'No email address provided' })
    }

    const emailBody = generateProjectEmail({
      projectName: project?.name || customTemplateName || 'Our Premium Property',
      leadName: toName || lead?.name || 'Valued Customer',
      propertyType: templateType || 'villa',
      customMessage,
      templateIntro,
      brochureUrl: brochureUrl || project?.brochureUrl,
      images: project?.images || [],
      amenities: project?.amenities || [],
      minPrice: project?.minPrice,
      maxPrice: project?.maxPrice,
      location: project?.location,
      city: project?.city,
      senderName: req.user?.name,
    })

    const transporter = await createTransporter()
    const fromEmail = await getCustomerFacingEmail()
    const fromName = await getSenderDisplayName()
    const attachmentUrl = brochureUrl || project?.brochureUrl
    const emailAttachments = attachments.length > 0
      ? attachments.map((file: { url: string; name?: string }) => ({ filename: file.name || 'Aarovia-file', href: file.url } as any))
      : attachmentUrl ? [{ filename: 'Aarovia-brochure', href: attachmentUrl } as any] : undefined
    const delivery = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject: subject?.trim() || `${project?.name || 'Premium Property'} - Project Details from Aarovia Real Estates`,
      html: emailBody,
      attachments: emailAttachments,
    })

    if (!delivery.accepted?.length || delivery.rejected?.length) {
      return res.status(502).json({
        success: false,
        message: delivery.rejected?.length ? `Email rejected for ${delivery.rejected.join(', ')}` : 'Email provider did not accept the recipient',
        accepted: delivery.accepted,
        rejected: delivery.rejected,
      })
    }

    // Log email
    if (leadId) {
      try {
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
      } catch (logError) {
        console.error('Project details email delivered but CRM logging failed', logError)
      }
    }

    res.json({ success: true, message: 'Email accepted by the mail server', data: { messageId: delivery.messageId, accepted: delivery.accepted } })
  } catch (error) {
    const emailError = error as { message?: string; code?: string; responseCode?: number; command?: string }
    console.error('Project details email failed', {
      message: emailError.message,
      code: emailError.code,
      responseCode: emailError.responseCode,
      command: emailError.command,
    })
    res.status(500).json({ success: false, message: 'Failed to send email', error })
  }
}

export const sendBulkEmail = async (req: any, res: any) => {
  const { leadIds, message, subject } = req.body
  if (!Array.isArray(leadIds) || !leadIds.length || !message?.trim()) return res.status(400).json({ success: false, message: 'Lead IDs and message are required' })
  const results = await Promise.allSettled(leadIds.map((leadId: string) => new Promise((resolve, reject) => {
    const finish = (body: any, code = 200) => code >= 400 ? reject(body) : resolve(body)
    sendProjectDetails({ body: { leadId, customMessage: message, subject }, user: req.user }, { status: (code: number) => ({ json: (body: any) => finish(body, code) }), json: (body: any) => finish(body) })
  })))
  const failed = results.filter(result => result.status === 'rejected').length
  res.json({ success: failed < leadIds.length, message: `Email sent to ${leadIds.length - failed} of ${leadIds.length} leads`, failed })
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

    const transporter = await createTransporter()
    const fromEmail = await getCustomerFacingEmail()
    const fromName = await getSenderDisplayName()
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
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
    <p style="color:#555;line-height:1.7">${data.templateIntro || `Thank you for your interest in ${data.projectName}. We are delighted to share the project details with you.`}</p>
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
    <p style="color:#8BA3C4;margin:0;font-size:13px">Aarovia Real Estates | aarovia.co.in</p>
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
    <p style="color:#8BA3C4;margin:0;font-size:12px">Aarovia Real Estates | aarovia.co.in</p>
  </div>
</div>
</body>
</html>`
