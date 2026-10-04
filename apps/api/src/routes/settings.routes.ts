import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import prisma from '../utils/prisma'
import { getTwilioSmsConfiguration, getWhatsAppConfiguration } from '../services/whatsapp.service'

const router = Router()
router.use(authenticate)

const adsSettingKeys = [
  'meta_app_id',
  'meta_app_secret',
  'meta_lead_verify_token',
  'meta_lead_access_token',
  'meta_ads_access_token',
  'meta_ad_account_id',
  'google_lead_webhook_key',
  'google_ads_client_id',
  'google_ads_client_secret',
  'google_ads_refresh_token',
  'google_ads_developer_token',
  'google_ads_customer_id',
  'google_ads_login_customer_id',
] as const

const adsSecretKeys = new Set<string>([
  'meta_app_secret',
  'meta_lead_verify_token',
  'meta_lead_access_token',
  'meta_ads_access_token',
  'google_lead_webhook_key',
  'google_ads_client_secret',
  'google_ads_refresh_token',
  'google_ads_developer_token',
])

const brandingKeys = ['brand_company_name', 'brand_logo_url', 'crm_domain', 'brand_accent_color'] as const
const protectedSettingKeys = [
  'wa_access_token',
  'twilio_auth_token',
  'twilio_api_key_secret',
  'sms_twilio_auth_token',
  'sms_twilio_api_key_secret',
  'gmail_app_password',
  'smtp_pass',
  'zoho_app_password',
  'meta_app_secret',
  'meta_lead_verify_token',
  'meta_lead_access_token',
  'meta_ads_access_token',
  'google_lead_webhook_key',
  'google_ads_client_secret',
  'google_ads_refresh_token',
  'google_ads_developer_token',
  ...adsSecretKeys,
]

router.get('/', async (req, res) => {
  try {
    const settings = await prisma.settings.findMany({
      where: { key: { notIn: protectedSettingKeys } },
    })
    const map = settings.reduce((acc: any, s) => { acc[s.key] = s.value; return acc }, {})
    res.json({ success: true, data: map })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to fetch settings' }) }
})

router.get('/branding', async (_req, res) => {
  try {
    const settings = await prisma.settings.findMany({ where: { key: { in: [...brandingKeys] } } })
    const values = settings.reduce<Record<string, string>>((result, setting) => {
      result[setting.key] = setting.value
      return result
    }, {})
    res.json({
      success: true,
      data: {
        companyName: values.brand_company_name || 'Aarovia',
        logoUrl: values.brand_logo_url || '/aarovia-mark.png',
        domain: values.crm_domain || 'aarovia.co.in',
        accentColor: values.brand_accent_color || '#C9A84C',
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to load branding settings' })
  }
})

router.post('/branding', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { companyName, domain, logoUrl, accentColor } = req.body || {}
    if (typeof companyName !== 'string' || !companyName.trim()) {
      return res.status(400).json({ success: false, message: 'Company name is required' })
    }
    if (typeof domain !== 'string' || !domain.trim()) {
      return res.status(400).json({ success: false, message: 'CRM domain is required' })
    }
    if (typeof logoUrl !== 'string' || typeof accentColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      return res.status(400).json({ success: false, message: 'A valid logo URL and accent color are required' })
    }
    if (logoUrl.startsWith('/') && !logoUrl.startsWith('//')) {
      if (!/^\/[a-zA-Z0-9/_\-.]+$/.test(logoUrl)) {
        return res.status(400).json({ success: false, message: 'Logo path is invalid' })
      }
    } else if (logoUrl) {
      let parsedLogoUrl: URL
      try {
        parsedLogoUrl = new URL(logoUrl)
      } catch {
        return res.status(400).json({ success: false, message: 'Logo URL must be a valid HTTPS image URL' })
      }
      if (parsedLogoUrl.protocol !== 'https:') {
        return res.status(400).json({ success: false, message: 'Logo URL must use HTTPS' })
      }
    }
    const values = [companyName.trim(), logoUrl.trim(), domain.trim(), accentColor]
    await prisma.$transaction(brandingKeys.map((key, index) => prisma.settings.upsert({
      where: { key },
      update: { value: values[index], group: 'branding' },
      create: { key, value: values[index], group: 'branding' },
    })))
    res.json({
      success: true,
      data: { companyName: values[0], logoUrl: values[1], domain: values[2], accentColor: values[3] },
      message: 'Branding settings saved',
    })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to save branding settings' })
  }
})

router.get('/ads', authorize('SUPER_ADMIN', 'ADMIN'), async (_req, res) => {
  try {
    const settings = await prisma.settings.findMany({ where: { key: { in: [...adsSettingKeys] } } })
    const values = settings.reduce<Record<string, string>>((result, setting) => {
      result[setting.key] = setting.value
      return result
    }, {})
    const data = Object.fromEntries(adsSettingKeys.map((key) => [
      adsSecretKeys.has(key) ? `${key}_configured` : key,
      adsSecretKeys.has(key) ? Boolean(values[key]) : values[key] || '',
    ]))
    Object.assign(data, {
      metaConfigured: Boolean(values.meta_app_id && values.meta_app_secret && (values.meta_lead_access_token || values.meta_ads_access_token)),
      googleConfigured: Boolean(values.google_ads_client_id && values.google_ads_client_secret && values.google_ads_refresh_token && values.google_ads_developer_token && values.google_ads_customer_id),
    })
    res.json({ success: true, data })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch Ads settings' })
  }
})

router.get('/email', authorize('SUPER_ADMIN', 'ADMIN'), async (_req, res) => {
  try {
    const settings = await prisma.settings.findMany({
      where: { key: { in: ['zoho_email', 'zoho_smtp_host', 'zoho_smtp_port', 'email_from_name', 'zoho_app_password'] } },
    })
    const values = settings.reduce<Record<string, string>>((result, setting) => {
      result[setting.key] = setting.value
      return result
    }, {})
    res.json({
      success: true,
      data: {
        zohoEmail: values.zoho_email || 'admin@aarovia.co.in',
        smtpHost: values.zoho_smtp_host || 'smtp.zoho.in',
        smtpPort: Number(values.zoho_smtp_port || 465),
        fromName: values.email_from_name || 'Aarovia Real Estates',
        appPasswordConfigured: Boolean(values.zoho_app_password),
        configured: Boolean(values.zoho_email && values.zoho_app_password),
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch Zoho email settings' })
  }
})

router.post('/email', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { zohoEmail, zohoAppPassword, smtpHost, smtpPort, fromName } = req.body || {}
    const email = typeof zohoEmail === 'string' ? zohoEmail.trim().toLowerCase() : ''
    const host = typeof smtpHost === 'string' ? smtpHost.trim().toLowerCase() : ''
    const port = Number(smtpPort)
    const displayName = typeof fromName === 'string' ? fromName.trim() : ''
    const password = typeof zohoAppPassword === 'string' ? zohoAppPassword.trim() : ''

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid Zoho email address' })
    }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) {
      return res.status(400).json({ success: false, message: 'Enter a valid Zoho SMTP hostname' })
    }
    if (![465, 587].includes(port)) {
      return res.status(400).json({ success: false, message: 'Zoho SMTP port must be 465 or 587' })
    }
    if (!displayName) {
      return res.status(400).json({ success: false, message: 'From name is required' })
    }
    if (password.length > 512) {
      return res.status(400).json({ success: false, message: 'Zoho app password is too long' })
    }

    const emailSettings = [
      ['zoho_email', email],
      ['zoho_smtp_host', host],
      ['zoho_smtp_port', String(port)],
      ['email_from_name', displayName],
    ] as const
    const existingPassword = await prisma.settings.findUnique({ where: { key: 'zoho_app_password' } })
    if (!password && !existingPassword?.value) {
      return res.status(400).json({ success: false, message: 'Email password is required for the first setup' })
    }

    await prisma.$transaction(async (transaction) => {
      for (const [key, value] of emailSettings) {
        await transaction.settings.upsert({
          where: { key },
          update: { value, group: 'email' },
          create: { key, value, group: 'email' },
        })
      }
      if (password) {
        await transaction.settings.upsert({
          where: { key: 'zoho_app_password' },
          update: { value: password, group: 'email' },
          create: { key: 'zoho_app_password', value: password, group: 'email' },
        })
      }
      await transaction.settings.deleteMany({
        where: { key: { in: ['gmail_user', 'gmail_app_password', 'smtp_user', 'smtp_pass', 'from_name'] } },
      })
    })
    res.json({ success: true, message: 'Zoho SMTP settings saved' })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to save Zoho email settings' })
  }
})

router.post('/ads', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const body = req.body || {}
    if (adsSettingKeys.some((key) => body[key] !== undefined && typeof body[key] !== 'string')) {
      return res.status(400).json({ success: false, message: 'Ads settings must be submitted as text values' })
    }
    const updates = adsSettingKeys.flatMap((key) => {
      const value = body[key]
      if (typeof value !== 'string' || !value.trim()) return []
      return [prisma.settings.upsert({
        where: { key },
        update: { value: value.trim(), group: 'ads' },
        create: { key, value: value.trim(), group: 'ads' },
      })]
    })
    await prisma.$transaction(updates)
    res.json({ success: true, message: 'Ads credentials saved' })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to save Ads settings' })
  }
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
        smsPhoneNumber: configuration.twilio.smsPhoneNumber,
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
      ['smsPhoneNumber', 'twilio_sms_phone_number', 'TWILIO_SMS_PHONE_NUMBER'],
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

router.get('/sms/twilio', authorize('SUPER_ADMIN', 'ADMIN'), async (_req, res) => {
  try {
    const configuration = await getTwilioSmsConfiguration()
    res.json({
      success: true,
      data: {
        accountSid: configuration.accountSid,
        authTokenConfigured: Boolean(configuration.authToken),
        apiKeySid: configuration.apiKeySid,
        apiKeySecretConfigured: Boolean(configuration.apiKeySecret),
        smsPhoneNumber: configuration.smsPhoneNumber,
        configured: configuration.configured,
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch Twilio SMS settings' })
  }
})

router.post('/sms/twilio', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const body = req.body || {}
    const keys = [
      ['accountSid', 'sms_twilio_account_sid', 'TWILIO_ACCOUNT_SID'],
      ['authToken', 'sms_twilio_auth_token', 'TWILIO_AUTH_TOKEN'],
      ['apiKeySid', 'sms_twilio_api_key_sid', 'TWILIO_API_KEY_SID'],
      ['apiKeySecret', 'sms_twilio_api_key_secret', 'TWILIO_API_KEY_SECRET'],
      ['smsPhoneNumber', 'twilio_sms_phone_number', 'TWILIO_SMS_PHONE_NUMBER'],
    ] as const
    const lookupKeys: string[] = [...new Set([
      ...keys.map(([, key]) => key),
      'twilio_account_sid',
      'twilio_auth_token',
      'twilio_api_key_sid',
      'twilio_api_key_secret',
    ])]
    const settings = await prisma.settings.findMany({ where: { key: { in: lookupKeys } } })
    const stored = settings.reduce<Record<string, string>>((result, setting) => {
      result[setting.key] = setting.value
      return result
    }, {})
    const values = keys.reduce<Record<string, string>>((result, [field, key, env]) => {
      const submitted = typeof body[field] === 'string' ? body[field].trim() : ''
      const sharedKey = key.replace(/^sms_/, '')
      result[key] = process.env[env] || submitted || stored[key] || stored[sharedKey] || ''
      return result
    }, {})
    const accountSid = values.sms_twilio_account_sid
    const authToken = values.sms_twilio_auth_token
    const apiKeySid = values.sms_twilio_api_key_sid
    const apiKeySecret = values.sms_twilio_api_key_secret
    const smsPhoneNumber = values.twilio_sms_phone_number
    if (!(accountSid && (authToken || (apiKeySid && apiKeySecret)) && smsPhoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Twilio Account SID, SMS sender number, and Auth Token or API key pair are required',
      })
    }
    if (!/^(?:\+[1-9]\d{7,14}|\d{10,15})$/.test(smsPhoneNumber.replace(/[\s().-]/g, ''))) {
      return res.status(400).json({ success: false, message: 'Enter a valid SMS sender number in international format' })
    }

    await prisma.$transaction(async (transaction) => {
      for (const [field, key, env] of keys) {
        const submitted = typeof body[field] === 'string' ? body[field].trim() : ''
        if (process.env[env] || !submitted) continue
        await transaction.settings.upsert({
          where: { key },
          update: { value: submitted, group: 'twilio-sms' },
          create: { key, value: submitted, group: 'twilio-sms' },
        })
      }
    })
    res.json({ success: true, data: { configured: true }, message: 'Twilio SMS settings saved' })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to save Twilio SMS settings' })
  }
})

export default router
