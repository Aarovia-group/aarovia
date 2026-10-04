import axios from 'axios'
import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { getWhatsAppConfiguration } from '../services/whatsapp.service'
import prisma from '../utils/prisma'

const toE164 = (value: string) => {
  const number = value.trim()
  if (/^whatsapp:/i.test(number)) throw new Error('Use an SMS-capable phone number, not a WhatsApp sender')
  const digits = number.replace(/\D/g, '')
  if (!digits) throw new Error('A valid phone number is required')
  if (number.startsWith('+')) return `+${digits}`
  if (digits.length === 10) return `+91${digits}`
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`
  throw new Error('Enter a valid phone number in international format')
}

export const sendLeadSms = async (req: AuthRequest, res: Response) => {
  const { message, consentConfirmed } = req.body || {}
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'SMS message is required' })
  }
  if (message.length > 1600) {
    return res.status(400).json({ success: false, message: 'SMS messages cannot exceed 1600 characters' })
  }
  if (consentConfirmed !== true) {
    return res.status(400).json({ success: false, message: 'Confirm the lead has consented to SMS before sending' })
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      select: { id: true, mobile: true },
    })
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' })

    const configuration = await getWhatsAppConfiguration()
    const { accountSid, authToken, apiKeySid, apiKeySecret, smsPhoneNumber } = configuration.twilio
    if (!accountSid || !(authToken || (apiKeySid && apiKeySecret)) || !smsPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Configure Twilio credentials and an SMS-capable sender number before sending',
      })
    }

    let from: string
    let to: string
    try {
      from = toE164(smsPhoneNumber)
      to = toE164(lead.mobile)
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'A valid SMS phone number is required',
      })
    }

    let twilioResponse
    try {
      twilioResponse = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({ From: from, To: to, Body: message.trim() }),
        {
          auth: {
            username: authToken ? accountSid : apiKeySid,
            password: authToken || apiKeySecret,
          },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      )
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const twilioMessage = error.response?.data?.message
        return res.status(502).json({
          success: false,
          message: typeof twilioMessage === 'string' ? `Twilio could not send SMS: ${twilioMessage}` : 'Twilio could not send SMS',
        })
      }
      throw error
    }

    const messageSid = typeof twilioResponse.data?.sid === 'string' ? twilioResponse.data.sid : null
    const status = typeof twilioResponse.data?.status === 'string' ? twilioResponse.data.status : 'accepted'
    let activityLogged = true
    try {
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: req.user!.id,
          type: 'SMS_SENT',
          description: 'SMS sent via Twilio',
          metadata: { provider: 'TWILIO', messageSid, status },
        },
      })
    } catch (error) {
      activityLogged = false
      console.error('[SMS] Message sent but lead activity logging failed', error)
    }

    return res.status(201).json({
      success: true,
      message: activityLogged ? 'SMS sent successfully' : 'SMS sent, but the CRM activity log could not be saved',
      data: { status, activityLogged },
    })
  } catch (error) {
    console.error('[SMS] Failed to send lead SMS', error)
    return res.status(500).json({ success: false, message: 'Failed to send SMS' })
  }
}
