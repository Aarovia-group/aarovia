import prisma from '../utils/prisma'

export const smsSettingFields = [
  { key: 'sms_twilio_account_sid', field: 'accountSid', env: 'SMS_TWILIO_ACCOUNT_SID', legacyKey: 'twilio_account_sid', legacyEnv: 'TWILIO_ACCOUNT_SID', secret: false },
  { key: 'sms_twilio_auth_token', field: 'authToken', env: 'SMS_TWILIO_AUTH_TOKEN', legacyKey: 'twilio_auth_token', legacyEnv: 'TWILIO_AUTH_TOKEN', secret: true },
  { key: 'sms_twilio_api_key_sid', field: 'apiKeySid', env: 'SMS_TWILIO_API_KEY_SID', legacyKey: 'twilio_api_key_sid', legacyEnv: 'TWILIO_API_KEY_SID', secret: false },
  { key: 'sms_twilio_api_key_secret', field: 'apiKeySecret', env: 'SMS_TWILIO_API_KEY_SECRET', legacyKey: 'twilio_api_key_secret', legacyEnv: 'TWILIO_API_KEY_SECRET', secret: true },
  { key: 'sms_twilio_phone_number', field: 'phoneNumber', env: 'SMS_TWILIO_PHONE_NUMBER', legacyKey: 'twilio_phone_number', legacyEnv: 'TWILIO_PHONE_NUMBER', secret: false },
  { key: 'sms_twilio_messaging_service_sid', field: 'messagingServiceSid', env: 'SMS_TWILIO_MESSAGING_SERVICE_SID', legacyKey: 'sms_twilio_messaging_service_sid', legacyEnv: 'TWILIO_MESSAGING_SERVICE_SID', secret: false },
] as const

export type SmsConfig = {
  accountSid: string
  authToken: string
  apiKeySid: string
  apiKeySecret: string
  phoneNumber: string
  messagingServiceSid: string
}

export const getSmsConfig = async (): Promise<SmsConfig> => {
  const keys = smsSettingFields.flatMap(item => [item.key, item.legacyKey])
  const settings = await prisma.settings.findMany({ where: { key: { in: keys } } })
  const stored = settings.reduce((result: Record<string, string>, item) => {
    result[item.key] = item.value
    return result
  }, {})

  return smsSettingFields.reduce<SmsConfig>((result, item) => {
    const useLegacyCredential = item.field !== 'phoneNumber' && item.field !== 'messagingServiceSid'
    const legacyValue = useLegacyCredential
      ? process.env[item.legacyEnv] || stored[item.legacyKey] || ''
      : ''
    result[item.field] = process.env[item.env] || stored[item.key] || legacyValue
    return result
  }, { accountSid: '', authToken: '', apiKeySid: '', apiKeySecret: '', phoneNumber: '', messagingServiceSid: '' })
}
