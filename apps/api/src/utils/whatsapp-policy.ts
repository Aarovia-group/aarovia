import prisma from './prisma'

export const normalizeWhatsAppNumber = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (value.trim().startsWith('+')) return `+${digits}`
  return digits.length === 10 ? `+91${digits}` : `+${digits}`
}

export const getStoredWhatsAppSettings = async () => {
  try {
    const settings = await prisma.settings.findMany({
      where: { key: { in: [
        'wa_provider', 'wa_phone_id', 'wa_access_token', 'wa_business_id', 'wa_template_name', 'wa_allow_raw_text',
        'twilio_account_sid', 'twilio_auth_token', 'twilio_api_key_sid', 'twilio_api_key_secret', 'twilio_phone_number', 'twilio_whatsapp_template_sid',
      ] } },
    })

    return settings.reduce<Record<string, string>>((result, setting) => {
      result[setting.key] = setting.value
      return result
    }, {})
  } catch {
    return {}
  }
}

export const getConfiguredWhatsAppSettings = async () => {
  const stored = await getStoredWhatsAppSettings()
  const phoneId = process.env.WHATSAPP_PHONE_ID || stored.wa_phone_id || ''
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || stored.wa_access_token || ''
  const metaConfigured = Boolean(phoneId && accessToken)
  const twilioConfigured = Boolean(
    (process.env.TWILIO_ACCOUNT_SID || stored.twilio_account_sid)
    && (process.env.TWILIO_AUTH_TOKEN || stored.twilio_auth_token || (process.env.TWILIO_API_KEY_SID || stored.twilio_api_key_sid) && (process.env.TWILIO_API_KEY_SECRET || stored.twilio_api_key_secret))
    && (process.env.TWILIO_PHONE_NUMBER || stored.twilio_phone_number),
  )
  const provider = (process.env.WHATSAPP_PROVIDER || stored.wa_provider || (metaConfigured ? 'META' : twilioConfigured ? 'TWILIO' : 'META')).trim().toUpperCase()
  const twilioTemplateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_SID
    || process.env.TWILIO_TEMPLATE_SID
    || stored.twilio_whatsapp_template_sid

  return {
    provider,
    phoneId,
    accessToken,
    businessId: process.env.WHATSAPP_BUSINESS_ID || stored.wa_business_id || '',
    templateName: provider === 'TWILIO'
      ? twilioTemplateSid
      : process.env.WHATSAPP_TEMPLATE_NAME || stored.wa_template_name || '',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || stored.twilio_account_sid || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || stored.twilio_auth_token || '',
    twilioApiKeySid: process.env.TWILIO_API_KEY_SID || stored.twilio_api_key_sid || '',
    twilioApiKeySecret: process.env.TWILIO_API_KEY_SECRET || stored.twilio_api_key_secret || '',
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || stored.twilio_phone_number || '',
    twilioTemplateSid,
    twilioConfigured,
    metaConfigured,
    allowRawText: process.env.ALLOW_RAW_WHATSAPP === 'true' || process.env.WHATSAPP_ALLOW_RAW_TEXT === 'true' || stored.wa_allow_raw_text === 'true',
  }
}

export const validateWhatsAppDeliveryPolicy = ({
  provider,
  hasTemplate,
  allowRawText,
}: {
  provider: 'TWILIO' | 'META' | 'UNKNOWN'
  hasTemplate: boolean
  allowRawText: boolean
}) => {
  if (provider === 'TWILIO' || provider === 'META') {
    const canSendRawText = allowRawText && !hasTemplate
    if (!canSendRawText && !hasTemplate) {
      throw new Error(
        'WhatsApp outbound text messages require an approved template or explicit recipient opt-in. Configure a template SID/name, or set ALLOW_RAW_WHATSAPP=true only for opted-in numbers.'
      )
    }
  }

  return true
}
