import axios from 'axios'
import prisma from '../utils/prisma'
import { getConfiguredWhatsAppSettings, normalizeWhatsAppNumber, validateWhatsAppDeliveryPolicy } from '../utils/whatsapp-policy'

const getTemplateName = (templateName?: string) =>
  templateName || process.env.WHATSAPP_TEMPLATE_NAME || process.env.TWILIO_WHATSAPP_TEMPLATE_SID || process.env.TWILIO_TEMPLATE_SID || ''

const sendWhatsAppMessage = async (
  to: string,
  message: string,
  options: { templateName?: string; templateVariables?: Record<string, string | number>; allowRawText?: boolean } = {}
) => {
  const storedWaSettings = await getConfiguredWhatsAppSettings()
  const twilioAccountSid = storedWaSettings.twilioAccountSid
  const twilioApiKeySid = storedWaSettings.twilioApiKeySid
  const twilioApiKeySecret = storedWaSettings.twilioApiKeySecret
  const twilioAuthToken = storedWaSettings.twilioAuthToken
  const twilioPhoneNumber = storedWaSettings.twilioPhoneNumber
  const whatsappProvider = storedWaSettings.provider
  const templateName = whatsappProvider === 'TWILIO'
    ? options.templateName || storedWaSettings.twilioTemplateSid
    : getTemplateName(options.templateName || storedWaSettings.templateName)
  const templateVariables = options.templateVariables || {}
  const allowRawText = options.allowRawText ?? storedWaSettings.allowRawText

  const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID || storedWaSettings.phoneId
  const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN || storedWaSettings.accessToken
  const hasMetaWhatsApp = storedWaSettings.metaConfigured
  const useTwilio = whatsappProvider === 'TWILIO' || (whatsappProvider !== 'META' && !hasMetaWhatsApp)

  if (useTwilio && twilioAccountSid && (twilioAuthToken || (twilioApiKeySid && twilioApiKeySecret)) && twilioPhoneNumber) {
    if (templateName) {
      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        new URLSearchParams({
          From: `whatsapp:${normalizeWhatsAppNumber(twilioPhoneNumber)}`,
          To: `whatsapp:${normalizeWhatsAppNumber(to)}`,
          ContentSid: templateName,
          ContentVariables: JSON.stringify(
            Object.fromEntries(Object.values(templateVariables).map((value, index) => [String(index + 1), String(value)])),
          ),
        }),
        {
          auth: {
            username: twilioAuthToken ? twilioAccountSid : twilioApiKeySid!,
            password: twilioAuthToken || twilioApiKeySecret!,
          },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      )
      return response.data
    }

    validateWhatsAppDeliveryPolicy({ provider: 'TWILIO', hasTemplate: false, allowRawText })

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      new URLSearchParams({
        From: `whatsapp:${normalizeWhatsAppNumber(twilioPhoneNumber)}`,
        To: `whatsapp:${normalizeWhatsAppNumber(to)}`,
        Body: message,
      }),
      {
        auth: {
          username: twilioAuthToken ? twilioAccountSid : twilioApiKeySid!,
          password: twilioAuthToken || twilioApiKeySecret!,
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    )
    return response.data
  }

  if (!whatsappPhoneId || !whatsappToken) throw new Error('WhatsApp provider is not configured')

  if (templateName) {
    const metaTemplateName = templateName.startsWith('HX') ? 'project_details' : templateName
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: normalizeWhatsAppNumber(to).replace(/\D/g, ''),
        type: 'template',
        template: {
          name: metaTemplateName,
          language: { code: metaTemplateName === 'project_details' ? 'en' : 'en_US' },
          components: Object.keys(templateVariables).length
            ? [{ type: 'body', parameters: Object.entries(templateVariables).map(([key, value]) => ({ type: 'text', text: String(value) })) }]
            : [],
        },
      },
      { headers: { Authorization: `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' } }
    )
    return response.data
  }

  validateWhatsAppDeliveryPolicy({ provider: 'META', hasTemplate: false, allowRawText })

  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: normalizeWhatsAppNumber(to).replace(/\D/g, ''),
      type: 'text',
      text: { body: message },
    },
    { headers: { Authorization: `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' } }
  )
  return response.data
}

export const sendProjectDetailsWA = async (req: any, res: any) => {
  try {
    const { leadId, mobile, projectId } = req.body

    const lead = leadId ? await prisma.lead.findUnique({ where: { id: leadId } }) : null
    const project = projectId ? await prisma.project.findUnique({ where: { id: projectId } }) : null
    const phone = mobile || lead?.mobile

    if (!phone) return res.status(400).json({ success: false, message: 'No phone number' })

    const message = `Hello ${lead?.name || 'there'} 👋

Thank you for your interest in *${project?.name || 'our premium properties'}*!

📍 *Location:* ${project?.location || 'Prime Location'}, ${project?.city || ''}
💰 *Starting from:* ₹${project?.minPrice ? (project.minPrice / 100000).toFixed(0) + 'L' : 'Contact us'}

✨ *Why Choose Aarovia?*
• Premium Quality Construction
• Modern Amenities
• Transparent Pricing
• Trusted by 500+ Happy Families

📞 Our team will reach out to you shortly with complete details.

*Aarovia Real Estates* | aarovia.co.in`

    const configuredTemplate = (await getConfiguredWhatsAppSettings()).templateName
    const templateVariables = {
      name: lead?.name || 'there',
      project: project?.name || 'our premium properties',
      city: project?.city || 'your preferred city',
      price: project?.minPrice ? `₹${(project.minPrice / 100000).toFixed(0)}L` : 'Contact us',
    }

    await sendWhatsAppMessage(phone, message, {
      templateName: configuredTemplate || undefined,
      templateVariables,
      allowRawText: false,
    })

    if (leadId) {
      await prisma.whatsappLog.create({
        data: { leadId, to: phone, message, status: 'SENT' },
      })
      await prisma.activity.create({
        data: {
          leadId, userId: req.user?.id,
          type: 'WHATSAPP_SENT',
          description: `WhatsApp project details sent to ${phone}`,
        },
      })
    }

    res.json({ success: true, message: 'WhatsApp message sent' })
  } catch (error: any) {
    const providerError = error?.response?.data?.code || error?.response?.data?.error?.message || error?.message
    console.error('[WhatsApp] Send failed', { code: providerError, status: error?.response?.status })
    res.status(502).json({ success: false, message: providerError ? `WhatsApp provider rejected the message (${providerError})` : 'WhatsApp provider is unavailable' })
  }
}

export const sendCustomWA = async (req: any, res: any) => {
  try {
    const { leadId, mobile, message } = req.body
    const lead = leadId ? await prisma.lead.findUnique({ where: { id: leadId } }) : null
    const project = lead?.projectId ? await prisma.project.findUnique({ where: { id: lead.projectId } }) : null
    const phone = mobile || lead?.mobile
    const text = typeof message === 'string' ? message.trim() : ''
    if (!phone) return res.status(400).json({ success: false, message: 'No phone number' })
    if (!text) return res.status(400).json({ success: false, message: 'Message is required' })

    await sendWhatsAppMessage(phone, text, {
      allowRawText: true,
      templateVariables: {
        name: lead?.name || 'there',
        project: project?.name || 'our premium properties',
        city: project?.city || 'your preferred city',
        price: project?.minPrice ? `Rs ${(project.minPrice / 100000).toFixed(0)}L` : 'Contact us',
      },
    })
    if (leadId) await prisma.whatsappLog.create({ data: { leadId, to: phone, message: text, status: 'SENT' } })
    res.json({ success: true, message: 'WhatsApp message sent' })
  } catch (error: any) {
    const providerError = error?.response?.data?.code || error?.response?.data?.error?.message || error?.message
    console.error('[WhatsApp] Custom send failed', { code: providerError, status: error?.response?.status })
    res.status(502).json({ success: false, message: providerError ? `WhatsApp provider rejected the message (${providerError})` : 'WhatsApp provider is unavailable' })
  }
}

export const sendBulkWA = async (req: any, res: any) => {
  const { leadIds, message } = req.body
  if (!Array.isArray(leadIds) || !leadIds.length || !message?.trim()) return res.status(400).json({ success: false, message: 'Lead IDs and message are required' })
  const results = await Promise.allSettled(leadIds.map((leadId: string) => new Promise((resolve, reject) => {
    const finish = (body: any, code = 200) => code >= 400 ? reject(body) : resolve(body)
    sendCustomWA({ body: { leadId, message }, user: req.user }, { status: (code: number) => ({ json: (body: any) => finish(body, code) }), json: (body: any) => finish(body) })
  })))
  const failed = results.filter(result => result.status === 'rejected').length
  res.json({ success: failed < leadIds.length, message: `WhatsApp sent to ${leadIds.length - failed} of ${leadIds.length} leads`, failed })
}

export const sendFollowupWA = async (req: any, res: any) => {
  try {
    const { leadId, mobile, customMessage } = req.body
    const lead = leadId ? await prisma.lead.findUnique({ where: { id: leadId }, include: { project: true } }) : null
    const phone = mobile || lead?.mobile
    if (!phone) return res.status(400).json({ success: false, message: 'Lead or phone not found' })

    const message = customMessage || `Hello ${lead?.name || 'there'} 👋

This is a gentle reminder from *Aarovia Real Estates*.

We wanted to follow up on your inquiry about ${lead?.project?.name || 'our premium properties'}.

Would you like to:
• 📅 Schedule a site visit?
• 📋 Receive a detailed quotation?
• 💬 Speak with our sales team?

Please feel free to reach out. We're here to help you find your dream property!

*Aarovia Real Estates Team*`

    const configuredTemplate = (await getConfiguredWhatsAppSettings()).templateName
    await sendWhatsAppMessage(phone, message, {
      templateName: configuredTemplate || undefined,
      templateVariables: {
        name: lead?.name || 'there',
        project: lead?.project?.name || 'our premium properties',
      },
      allowRawText: false,
    })
    if (leadId) {
      await prisma.whatsappLog.create({ data: { leadId, to: phone, message, status: 'SENT' } })
      await prisma.activity.create({
        data: { leadId, userId: req.user?.id, type: 'WHATSAPP_SENT', description: 'Followup WhatsApp sent' },
      })
    }

    res.json({ success: true, message: 'Followup sent' })
  } catch (error: any) {
    const providerError = error?.response?.data?.code || error?.response?.data?.error?.message || error?.message
    console.error('[WhatsApp] Followup failed', { code: providerError, status: error?.response?.status })
    res.status(502).json({ success: false, message: providerError ? `WhatsApp provider rejected the message (${providerError})` : 'WhatsApp provider is unavailable' })
  }
}

export const sendPaymentReminderWA = async (req: any, res: any) => {
  try {
    const { bookingId } = req.body
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, inventory: { include: { project: true } } },
    })
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' })

    const message = `Dear ${booking.customer.name} 🏠

This is a payment reminder from *Aarovia Real Estates*.

📋 *Booking:* ${booking.bookingNumber}
🏢 *Unit:* ${booking.inventory.unitNumber}
💰 *Due Amount:* ₹${booking.dueAmount.toLocaleString('en-IN')}

Please ensure timely payment to avoid any late charges.

For payment details, contact us at aarovia.co.in

Thank you! 🙏
*Aarovia Real Estates*`

    const configuredTemplate = (await getConfiguredWhatsAppSettings()).templateName
    await sendWhatsAppMessage(booking.customer.mobile, message, {
      templateName: configuredTemplate || undefined,
      templateVariables: {
        name: booking.customer.name,
        booking: booking.bookingNumber,
        amount: booking.dueAmount.toLocaleString('en-IN'),
      },
      allowRawText: false,
    })
    res.json({ success: true, message: 'Payment reminder sent' })
  } catch (error: any) {
    const providerError = error?.response?.data?.code || error?.response?.data?.error?.message || error?.message
    console.error('[WhatsApp] Payment reminder failed', { code: providerError, status: error?.response?.status })
    res.status(502).json({ success: false, message: providerError ? `WhatsApp provider rejected the message (${providerError})` : 'WhatsApp provider is unavailable' })
  }
}

export const getWhatsAppLogs = async (req: any, res: any) => {
  try {
    const { leadId, page = '1', limit = '20' } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where = leadId ? { leadId } : {}

    const [logs, total] = await Promise.all([
      prisma.whatsappLog.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { lead: { select: { name: true } } },
      }),
      prisma.whatsappLog.count({ where }),
    ])

    res.json({ success: true, data: logs, meta: { total } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch logs', error })
  }
}
