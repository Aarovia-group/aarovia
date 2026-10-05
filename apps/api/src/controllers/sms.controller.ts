import axios from 'axios'
import prisma from '../utils/prisma'
import { getSmsConfig } from '../services/sms-config'

const normalizeNumber = (value: string) => {
  const digits = value.replace(/\D/g, '')
  return value.trim().startsWith('+') ? `+${digits}` : digits.length === 10 ? `+91${digits}` : `+${digits}`
}

export const sendCustomSms = async (req: any, res: any) => {
  try {
    const { leadId, mobile, message } = req.body
    const lead = leadId ? await prisma.lead.findUnique({ where: { id: leadId } }) : null
    const to = normalizeNumber(mobile || lead?.mobile || '')
    const text = typeof message === 'string' ? message.trim() : ''
    const { accountSid, authToken, apiKeySid, apiKeySecret, phoneNumber, messagingServiceSid } = await getSmsConfig()
    const from = normalizeNumber(phoneNumber)
    const useApiKey = Boolean(apiKeySid && apiKeySecret)

    if (!to) return res.status(400).json({ success: false, message: 'No phone number' })
    if (!text) return res.status(400).json({ success: false, message: 'Message is required' })
    if (!accountSid || !(authToken || (apiKeySid && apiKeySecret))) {
      return res.status(503).json({ success: false, message: 'Twilio SMS credentials are not configured' })
    }
    if (!(messagingServiceSid || from)) {
      return res.status(503).json({ success: false, message: 'Configure an SMS sender number or Twilio Messaging Service SID in SMS settings' })
    }

    const smsPayload = new URLSearchParams({ To: to, Body: text })
    if (messagingServiceSid) smsPayload.set('MessagingServiceSid', messagingServiceSid)
    else smsPayload.set('From', from)

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      smsPayload,
      {
        auth: {
          username: useApiKey ? apiKeySid : accountSid,
          password: useApiKey ? apiKeySecret : authToken,
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    )

    if (leadId) await prisma.activity.create({ data: { leadId, userId: req.user?.id, type: 'SMS_SENT', description: `SMS sent to ${to}` } })
    res.json({ success: true, message: 'SMS sent', data: { sid: response.data.sid } })
  } catch (error: any) {
    const providerError = error?.response?.data?.message || error?.message
    console.error('[SMS] Send failed', { code: error?.response?.data?.code, status: error?.response?.status })
    res.status(502).json({ success: false, message: providerError ? `SMS provider rejected the message (${providerError})` : 'SMS provider is unavailable' })
  }
}

export const sendBulkSms = async (req: any, res: any) => {
  const { leadIds, message } = req.body
  if (!Array.isArray(leadIds) || !leadIds.length || !message?.trim()) return res.status(400).json({ success: false, message: 'Lead IDs and message are required' })
  const results = await Promise.allSettled(leadIds.map((leadId: string) => new Promise((resolve, reject) => {
    const finish = (body: any, code = 200) => code >= 400 ? reject(body) : resolve(body)
    sendCustomSms({ body: { leadId, message }, user: req.user }, { status: (code: number) => ({ json: (body: any) => finish(body, code) }), json: (body: any) => finish(body) })
  })))
  const failed = results.filter(result => result.status === 'rejected').length
  res.json({ success: failed < leadIds.length, message: `SMS sent to ${leadIds.length - failed} of ${leadIds.length} leads`, failed })
}