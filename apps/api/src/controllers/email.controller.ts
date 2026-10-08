import prisma from '../utils/prisma'
import { createTransporter, getCustomerFacingEmail, getSenderDisplayName } from '../utils/email'
import { PropertyType } from '@prisma/client'

const emailTemplateDefaults: Array<{
  id: string
  name: string
  subject: string
  body: string
  propertyType: PropertyType
  variables: string[]
}> = [
  { id: 'email-template-villa', name: 'Villa', subject: '{{projectName}} - Villa Details from Aarovia Real Estates', body: 'Thank you for your interest in {{projectName}}. We are delighted to share the villa details with you.', propertyType: 'VILLA', variables: ['projectName', 'leadName', 'customMessage'] },
  { id: 'email-template-apartment', name: 'Apartment', subject: '{{projectName}} - Apartment Details from Aarovia Real Estates', body: 'Thank you for your interest in {{projectName}}. We are delighted to share the apartment details with you.', propertyType: 'APARTMENT', variables: ['projectName', 'leadName', 'customMessage'] },
  { id: 'email-template-plot', name: 'Plot', subject: '{{projectName}} - Plot Details from Aarovia Real Estates', body: 'Thank you for your interest in {{projectName}}. We are delighted to share the plot details with you.', propertyType: 'PLOT', variables: ['projectName', 'leadName', 'customMessage'] },
  { id: 'email-template-farmland', name: 'Farm Land', subject: '{{projectName}} - Farm Land Details from Aarovia Real Estates', body: 'Thank you for your interest in {{projectName}}. We are delighted to share the farm land details with you.', propertyType: 'FARMLAND', variables: ['projectName', 'leadName', 'customMessage'] },
  { id: 'email-template-commercial', name: 'Commercial', subject: '{{projectName}} - Commercial Details from Aarovia Real Estates', body: 'Thank you for your interest in {{projectName}}. We are delighted to share the commercial property details with you.', propertyType: 'COMMERCIAL', variables: ['projectName', 'leadName', 'customMessage'] },
]

const validPropertyTypes = new Set<string>(['VILLA', 'APARTMENT', 'PLOT', 'FARMLAND', 'COMMERCIAL'])

const ensureEmailTemplatesInitialized = async () => {
  const marker = await prisma.settings.findUnique({
    where: { key: 'email_templates_initialized' },
    select: { value: true },
  })
  if (marker?.value === 'true') return

  const existing = await prisma.emailTemplate.count({ where: { projectId: null } })
  if (existing === 0) {
    await prisma.emailTemplate.createMany({ data: emailTemplateDefaults, skipDuplicates: true })
  }
  await prisma.settings.upsert({
    where: { key: 'email_templates_initialized' },
    update: { value: 'true' },
    create: { key: 'email_templates_initialized', value: 'true', group: 'email' },
  })
}

const getTemplateFields = (body: Record<string, unknown>) => {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const templateBody = typeof body.body === 'string' ? body.body.trim() : ''
  const rawPropertyType = body.propertyType
  const propertyType = rawPropertyType === null || rawPropertyType === '' ? null : String(rawPropertyType).toUpperCase()

  if (!name || !subject || !templateBody) {
    throw new Error('Template name, subject, and body are required')
  }
  if (name.length > 120 || subject.length > 300 || templateBody.length > 12000) {
    throw new Error('Template name, subject, or body exceeds the allowed length')
  }
  if (propertyType !== null && !validPropertyTypes.has(propertyType)) {
    throw new Error('Template property type is invalid')
  }
  const variables = Array.from(new Set(templateBody.match(/{{\s*([a-zA-Z]+)\s*}}/g) || []))
    .map(variable => variable.replace(/[{} ]/g, ''))
  return { name, subject, body: templateBody, propertyType: propertyType as PropertyType | null, variables }
}

export const getEmailTemplates = async (_req: any, res: any) => {
  try {
    await ensureEmailTemplatesInitialized()
    const templates = await prisma.emailTemplate.findMany({
      where: { projectId: null, isActive: true },
      orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    })
    res.json({ success: true, data: templates })
  } catch (error) {
    console.error('Failed to fetch email templates', error)
    res.status(500).json({ success: false, message: 'Failed to fetch email templates' })
  }
}

export const createEmailTemplate = async (req: any, res: any) => {
  try {
    const fields = getTemplateFields(req.body || {})
    const template = await prisma.emailTemplate.create({
      data: { ...fields, projectId: null, isActive: true },
    })
    res.status(201).json({ success: true, data: template, message: 'Email template created' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create email template'
    const status = message.startsWith('Template ') ? 400 : 500
    if (status === 500) console.error('Failed to create email template', error)
    res.status(status).json({ success: false, message })
  }
}

export const updateEmailTemplate = async (req: any, res: any) => {
  try {
    const fields = getTemplateFields(req.body || {})
    const existing = await prisma.emailTemplate.findFirst({
      where: { id: req.params.id, projectId: null },
      select: { id: true },
    })
    if (!existing) return res.status(404).json({ success: false, message: 'Email template not found' })

    const template = await prisma.emailTemplate.update({
      where: { id: existing.id },
      data: fields,
    })
    res.json({ success: true, data: template, message: 'Email template updated' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update email template'
    const status = message.startsWith('Template ') ? 400 : 500
    if (status === 500) console.error('Failed to update email template', error)
    res.status(status).json({ success: false, message })
  }
}

export const deleteEmailTemplate = async (req: any, res: any) => {
  try {
    const result = await prisma.emailTemplate.deleteMany({
      where: { id: req.params.id, projectId: null },
    })
    if (!result.count) return res.status(404).json({ success: false, message: 'Email template not found' })
    res.json({ success: true, message: 'Email template deleted' })
  } catch (error) {
    console.error('Failed to delete email template', error)
    res.status(500).json({ success: false, message: 'Failed to delete email template' })
  }
}

export const sendProjectDetails = async (req: any, res: any) => {
  try {
    const { leadId, projectId, templateType, customTemplateName, templateIntro, toEmail, toName, customMessage, subject, brochureUrl, attachments = [] } = req.body
    const templateId = typeof req.body?.templateId === 'string' ? req.body.templateId : ''
    if (req.body?.templateId && !templateId) {
      return res.status(400).json({ success: false, message: 'Invalid email template ID' })
    }

    const [lead, project, template] = await Promise.all([
      leadId ? prisma.lead.findUnique({ where: { id: leadId }, include: { project: true } }) : null,
      projectId ? prisma.project.findUnique({ where: { id: projectId } }) : null,
      templateId ? prisma.emailTemplate.findFirst({ where: { id: templateId, projectId: null, isActive: true } }) : null,
    ])
    if (templateId && !template) {
      return res.status(404).json({ success: false, message: 'Selected email template was not found or is inactive' })
    }

    const recipientEmail = toEmail || lead?.email
    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'No email address provided' })
    }
    const projectName = project?.name || lead?.project?.name || customTemplateName || 'Premium Property'
    const subjectTemplate = typeof subject === 'string' && subject.trim()
      ? subject.trim()
      : template?.subject || `${projectName} - Project Details from Aarovia Real Estates`
    const emailSubject = subjectTemplate.replace(/{{\s*([a-zA-Z]+)\s*}}/g, (_match, variable: string) => {
      const values: Record<string, string> = {
        projectname: projectName,
        leadname: toName || lead?.name || 'Valued Customer',
        location: project?.location || lead?.project?.location || '',
        city: project?.city || lead?.project?.city || '',
      }
      return values[variable.toLowerCase()] || ''
    })

    const emailBody = generateProjectEmail({
      projectName: project?.name || lead?.project?.name || customTemplateName || 'Our Premium Property',
      leadName: toName || lead?.name || 'Valued Customer',
      propertyType: template?.propertyType || templateType || 'villa',
      templateBody: template?.body,
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
      subject: emailSubject,
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
          data: { leadId, to: recipientEmail, subject: emailSubject, status: 'SENT' },
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
    const authenticationRejected = emailError.code === 'EAUTH'
    console.error('Project details email failed', {
      message: emailError.message,
      code: emailError.code,
      responseCode: emailError.responseCode,
      command: emailError.command,
    })
    res.status(authenticationRejected ? 502 : 500).json({
      success: false,
      message: authenticationRejected
        ? 'Zoho rejected SMTP authentication. Check the account-specific SMTP server in Zoho Mail settings, confirm the full mailbox address, use an app-specific password if MFA is enabled, and ensure SMTP access is enabled.'
        : 'Failed to send email',
    })
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

const escapeEmailHtml = (value: unknown) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const renderTemplateBody = (body: string, data: Record<string, unknown>) => {
  const values = Object.fromEntries(Object.entries(data).map(([key, value]) => [key.toLowerCase(), value]))
  const rendered = body.replace(/{{\s*([a-zA-Z]+)\s*}}/g, (_match, variable: string) =>
    escapeEmailHtml(values[variable.toLowerCase()]),
  )
  return rendered
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p style="color:#555;line-height:1.7">${line}</p>`)
    .join('')
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
    <p style="color:#333;font-size:16px">Dear ${escapeEmailHtml(data.leadName)},</p>
    ${data.templateBody
      ? renderTemplateBody(data.templateBody, {
          leadName: data.leadName,
          projectName: data.projectName,
          location: data.location,
          city: data.city,
          customMessage: data.customMessage,
        })
      : `<p style="color:#555;line-height:1.7">${escapeEmailHtml(data.templateIntro || `Thank you for your interest in ${data.projectName}. We are delighted to share the project details with you.`)}</p>`}
    ${data.customMessage && !/\{\{\s*customMessage\s*\}\}/i.test(data.templateBody || '') ? `<p style="color:#555;line-height:1.7">${escapeEmailHtml(data.customMessage)}</p>` : ''}
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
