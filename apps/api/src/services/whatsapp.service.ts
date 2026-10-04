import axios from 'axios'
import prisma from '../utils/prisma'

const META_SETTING_KEYS = ['wa_phone_id', 'wa_access_token', 'wa_business_id']
const TWILIO_SETTING_KEYS = [
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_api_key_sid',
  'twilio_api_key_secret',
  'twilio_phone_number',
  'twilio_sms_phone_number',
  'twilio_whatsapp_template_sid',
]

const normalizeNumber = (value: string) => {
  const number = value.replace(/^whatsapp:/i, '').trim()
  const digits = number.replace(/\D/g, '')
  if (!digits) throw new Error('A valid WhatsApp number is required')
  if (number.startsWith('+')) return `+${digits}`
  return digits.length === 10 ? `+91${digits}` : `+${digits}`
}

const getSettings = async () => {
  const settings = await prisma.settings.findMany({
    where: { key: { in: ['wa_provider', ...META_SETTING_KEYS, ...TWILIO_SETTING_KEYS] } },
  })
  return settings.reduce<Record<string, string>>((result, setting) => {
    result[setting.key] = setting.value
    return result
  }, {})
}

export const getWhatsAppConfiguration = async () => {
  const stored = await getSettings()
  const meta = {
    phoneId: process.env.WHATSAPP_PHONE_ID || stored.wa_phone_id || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || stored.wa_access_token || '',
    businessId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || stored.wa_business_id || '',
  }
  const twilio = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || stored.twilio_account_sid || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || stored.twilio_auth_token || '',
    apiKeySid: process.env.TWILIO_API_KEY_SID || stored.twilio_api_key_sid || '',
    apiKeySecret: process.env.TWILIO_API_KEY_SECRET || stored.twilio_api_key_secret || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || stored.twilio_phone_number || '',
    smsPhoneNumber: process.env.TWILIO_SMS_PHONE_NUMBER || stored.twilio_sms_phone_number || '',
    templateSid: process.env.TWILIO_WHATSAPP_TEMPLATE_SID || stored.twilio_whatsapp_template_sid || '',
  }
  const metaConfigured = Boolean(meta.phoneId && meta.accessToken)
  const twilioConfigured = Boolean(
    twilio.accountSid
    && (twilio.authToken || (twilio.apiKeySid && twilio.apiKeySecret))
    && twilio.phoneNumber,
  )
  const configuredProvider = process.env.WHATSAPP_PROVIDER || stored.wa_provider
  const provider = (configuredProvider || (metaConfigured ? 'META' : twilioConfigured ? 'TWILIO' : 'META')).toUpperCase()

  return {
    provider,
    providerLocked: Boolean(process.env.WHATSAPP_PROVIDER),
    meta,
    twilio,
    metaConfigured,
    twilioConfigured,
    configured: provider === 'META' ? metaConfigured : provider === 'TWILIO' ? twilioConfigured : false,
  }
}

export const sendWhatsAppMessage = async (to: string, message: string) => {
  const configuration = await getWhatsAppConfiguration()
  if (!configuration.configured) {
    throw new Error(`${configuration.provider === 'TWILIO' ? 'Twilio' : 'Meta'} WhatsApp is selected but not fully configured`)
  }

  if (configuration.provider === 'TWILIO') {
    const { accountSid, authToken, apiKeySid, apiKeySecret, phoneNumber, templateSid } = configuration.twilio
    const payload = new URLSearchParams({
      From: `whatsapp:${normalizeNumber(phoneNumber)}`,
      To: `whatsapp:${normalizeNumber(to)}`,
      ...(templateSid
        ? { ContentSid: templateSid, ContentVariables: JSON.stringify({ '1': message }) }
        : { Body: message }),
    })
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      payload,
      {
        auth: {
          username: authToken ? accountSid : apiKeySid,
          password: authToken || apiKeySecret,
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    )
    return response.data
  }

  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${configuration.meta.phoneId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: normalizeNumber(to).replace(/\D/g, ''),
      type: 'text',
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${configuration.meta.accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )
  return response.data
}
