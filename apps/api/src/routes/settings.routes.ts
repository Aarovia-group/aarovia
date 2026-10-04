import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import prisma from '../utils/prisma'
import { getWhatsAppConfiguration } from '../services/whatsapp.service'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const settings = await prisma.settings.findMany({
      where: { key: { notIn: ['wa_access_token', 'twilio_auth_token', 'twilio_api_key_secret'] } },
    })
    const map = settings.reduce((acc: any, s) => { acc[s.key] = s.value; return acc }, {})
    res.json({ success: true, data: map })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to fetch settings' }) }
})

router.get('/whatsapp/status', async (_req, res) => {
  try {
    const configuration = await getWhatsAppConfiguration()
    res.json({
      success: true,
      data: {
        provider: configuration.provider,
        configured: configuration.configured,
        providerLocked: configuration.providerLocked,
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch WhatsApp status' })
  }
})

router.get('/whatsapp', authorize('SUPER_ADMIN', 'ADMIN'), async (_req, res) => {
  try {
    const configuration = await getWhatsAppConfiguration()
    res.json({
      success: true,
      data: {
        phoneId: configuration.meta.phoneId,
        hasAccessToken: Boolean(configuration.meta.accessToken),
        businessId: configuration.meta.businessId,
        configured: configuration.metaConfigured,
        provider: configuration.provider,
        providerLocked: configuration.providerLocked,
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch Meta WhatsApp API settings' })
  }
})

router.post('/email', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { gmailUser, gmailAppPassword, fromName } = req.body
    await Promise.all([
      prisma.settings.upsert({ where: { key: 'gmail_user' }, update: { value: gmailUser }, create: { key: 'gmail_user', value: gmailUser, group: 'email' } }),
      prisma.settings.upsert({ where: { key: 'gmail_app_password' }, update: { value: gmailAppPassword }, create: { key: 'gmail_app_password', value: gmailAppPassword, group: 'email' } }),
      prisma.settings.upsert({ where: { key: 'from_name' }, update: { value: fromName }, create: { key: 'from_name', value: fromName, group: 'email' } }),
    ])
    res.json({ success: true, message: 'Email config saved' })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to save email config' }) }
})

router.post('/whatsapp', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    if (process.env.WHATSAPP_PROVIDER && process.env.WHATSAPP_PROVIDER.toUpperCase() !== 'META') {
      return res.status(400).json({ success: false, message: 'Provider is locked by the WHATSAPP_PROVIDER environment variable' })
    }
    const body = req.body || {}
    const [currentPhoneId, currentAccessToken, currentBusinessId] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'wa_phone_id' } }),
      prisma.settings.findUnique({ where: { key: 'wa_access_token' } }),
      prisma.settings.findUnique({ where: { key: 'wa_business_id' } }),
    ])
    const phoneId = process.env.WHATSAPP_PHONE_ID || (typeof body.phoneId === 'string' && body.phoneId.trim()) || currentPhoneId?.value || ''
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || (typeof body.accessToken === 'string' && body.accessToken.trim()) || currentAccessToken?.value || ''
    const businessId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || (typeof body.businessId === 'string' && body.businessId.trim()) || currentBusinessId?.value || ''
    if (!phoneId || !accessToken) {
      return res.status(400).json({ success: false, message: 'Meta WhatsApp Phone Number ID and Access Token are required' })
    }
    await Promise.all([
      ...([
        ['phoneId', 'wa_phone_id', 'WHATSAPP_PHONE_ID'],
        ['accessToken', 'wa_access_token', 'WHATSAPP_ACCESS_TOKEN'],
        ['businessId', 'wa_business_id', 'WHATSAPP_BUSINESS_ACCOUNT_ID'],
      ] as const).map(([field, key, env]) => {
        const submitted = typeof body[field] === 'string' ? body[field].trim() : ''
        if (process.env[env] || !submitted) return Promise.resolve()
        return prisma.settings.upsert({
          where: { key },
          update: { value: submitted, group: 'whatsapp' },
          create: { key, value: submitted, group: 'whatsapp' },
        })
      }),
      prisma.settings.upsert({ where: { key: 'wa_provider' }, update: { value: 'META', group: 'whatsapp' }, create: { key: 'wa_provider', value: 'META', group: 'whatsapp' } }),
    ])
    res.json({ success: true, data: { provider: 'META', hasAccessToken: true }, message: 'Meta WhatsApp API settings saved' })
  } catch { res.status(500).json({ success: false, message: 'Failed to save Meta WhatsApp API settings' }) }
})

router.get('/whatsapp/twilio', authorize('SUPER_ADMIN', 'ADMIN'), async (_req, res) => {
  try {
    const configuration = await getWhatsAppConfiguration()
    res.json({
      success: true,
      data: {
        provider: configuration.provider,
        providerLocked: configuration.providerLocked,
        accountSid: configuration.twilio.accountSid,
        authTokenConfigured: Boolean(configuration.twilio.authToken),
        apiKeySid: configuration.twilio.apiKeySid,
        apiKeySecretConfigured: Boolean(configuration.twilio.apiKeySecret),
        phoneNumber: configuration.twilio.phoneNumber,
        templateSid: configuration.twilio.templateSid,
        configured: configuration.twilioConfigured,
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch Twilio WhatsApp settings' })
  }
})

router.post('/whatsapp/twilio', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    if (process.env.WHATSAPP_PROVIDER && process.env.WHATSAPP_PROVIDER.toUpperCase() !== 'TWILIO') {
      return res.status(400).json({ success: false, message: 'Provider is locked by the WHATSAPP_PROVIDER environment variable' })
    }
    const body = req.body || {}
    const keys = [
      ['accountSid', 'twilio_account_sid', 'TWILIO_ACCOUNT_SID'],
      ['authToken', 'twilio_auth_token', 'TWILIO_AUTH_TOKEN'],
      ['apiKeySid', 'twilio_api_key_sid', 'TWILIO_API_KEY_SID'],
      ['apiKeySecret', 'twilio_api_key_secret', 'TWILIO_API_KEY_SECRET'],
      ['phoneNumber', 'twilio_phone_number', 'TWILIO_PHONE_NUMBER'],
      ['templateSid', 'twilio_whatsapp_template_sid', 'TWILIO_WHATSAPP_TEMPLATE_SID'],
    ] as const
    const currentSettings = await prisma.settings.findMany({ where: { key: { in: keys.map(([, key]) => key) } } })
    const current = currentSettings.reduce<Record<string, string>>((result, setting) => {
      result[setting.key] = setting.value
      return result
    }, {})
    const values = keys.reduce<Record<string, string>>((result, [field, key, env]) => {
      const submitted = typeof body[field] === 'string' ? body[field].trim() : ''
      result[key] = process.env[env] || submitted || current[key] || ''
      return result
    }, {})
    const accountSid = values.twilio_account_sid
    const authToken = values.twilio_auth_token
    const apiKeySid = values.twilio_api_key_sid
    const apiKeySecret = values.twilio_api_key_secret
    const phoneNumber = values.twilio_phone_number
    if (!(accountSid && (authToken || (apiKeySid && apiKeySecret)) && phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Twilio Account SID, WhatsApp sender number, and Auth Token or API key pair are required',
      })
    }
    await Promise.all([
      ...keys.map(([field, key, env]) => {
        const submitted = typeof body[field] === 'string' ? body[field].trim() : ''
        const value = process.env[env] ? '' : submitted
        if (!value) return Promise.resolve()
        return prisma.settings.upsert({
          where: { key },
          update: { value, group: 'whatsapp-twilio' },
          create: { key, value, group: 'whatsapp-twilio' },
        })
      }),
      prisma.settings.upsert({
        where: { key: 'wa_provider' },
        update: { value: 'TWILIO', group: 'whatsapp' },
        create: { key: 'wa_provider', value: 'TWILIO', group: 'whatsapp' },
      }),
    ])
    res.json({ success: true, data: { provider: 'TWILIO', configured: true }, message: 'Twilio WhatsApp settings saved' })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to save Twilio WhatsApp settings' })
  }
})

export default router
