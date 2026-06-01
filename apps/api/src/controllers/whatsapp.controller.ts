import axios from 'axios'
import prisma from '../utils/prisma'

const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

const sendWhatsAppMessage = async (to: string, message: string) => {
  const response = await axios.post(
    WHATSAPP_API_URL,
    {
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''),
      type: 'text',
      text: { body: message },
    },
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } }
  )
  return response.data
}

export const sendProjectDetailsWA = async (req: any, res: any) => {
  try {
    const { leadId, mobile, projectId } = req.body

    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
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

*Aarovia Real Estates* | crm.aarovia.co.in`

    await sendWhatsAppMessage(phone, message)

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
    res.status(500).json({ success: false, message: 'Failed to send WhatsApp', error: error?.response?.data || error })
  }
}

export const sendFollowupWA = async (req: any, res: any) => {
  try {
    const { leadId, customMessage } = req.body
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { project: true } })
    if (!lead || !lead.mobile) return res.status(400).json({ success: false, message: 'Lead or phone not found' })

    const message = customMessage || `Hello ${lead.name} 👋

This is a gentle reminder from *Aarovia Real Estates*.

We wanted to follow up on your inquiry about ${lead.project?.name || 'our premium properties'}.

Would you like to:
• 📅 Schedule a site visit?
• 📋 Receive a detailed quotation?
• 💬 Speak with our sales team?

Please feel free to reach out. We're here to help you find your dream property!

*Aarovia Real Estates Team*`

    await sendWhatsAppMessage(lead.mobile, message)
    await prisma.whatsappLog.create({ data: { leadId, to: lead.mobile, message, status: 'SENT' } })
    await prisma.activity.create({
      data: { leadId, userId: req.user?.id, type: 'WHATSAPP_SENT', description: 'Followup WhatsApp sent' },
    })

    res.json({ success: true, message: 'Followup sent' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to send WhatsApp', error: error?.response?.data || error })
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

For payment details, contact us at crm.aarovia.co.in

Thank you! 🙏
*Aarovia Real Estates*`

    await sendWhatsAppMessage(booking.customer.mobile, message)
    res.json({ success: true, message: 'Payment reminder sent' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to send reminder', error: error?.response?.data || error })
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
