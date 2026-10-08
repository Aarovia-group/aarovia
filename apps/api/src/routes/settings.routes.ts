import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import prisma from '../utils/prisma'
import { parseIncomingCallRoutes, parseOutgoingDidRoutes, validateIncomingCallRoutes, validateOutgoingDidRoutes } from '../services/incoming-call-routing'
import { getSmsConfig, smsSettingFields } from '../services/sms-config'
import type { AuthRequest } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

const adsSecretKeys = [
  'meta_app_secret', 'meta_lead_verify_token', 'meta_lead_access_token', 'meta_ads_access_token',
  'google_lead_webhook_key', 'google_ads_client_secret', 'google_ads_refresh_token',
  'google_ads_developer_token',
]

const adsSettingKeys = [
  'meta_app_id', 'meta_app_secret', 'meta_lead_verify_token', 'meta_lead_access_token', 'meta_ads_access_token', 'meta_ad_account_id',
  'google_lead_webhook_key', 'google_ads_client_id', 'google_ads_client_secret', 'google_ads_refresh_token',
  'google_ads_developer_token', 'google_ads_customer_id', 'google_ads_login_customer_id',
]

const adsEnvironmentKeys: Record<string, string> = {
  meta_app_id: 'META_APP_ID',
  meta_app_secret: 'META_APP_SECRET',
  meta_lead_verify_token: 'META_LEAD_VERIFY_TOKEN',
  meta_lead_access_token: 'META_LEAD_ACCESS_TOKEN',
  meta_ads_access_token: 'META_ADS_ACCESS_TOKEN',
  meta_ad_account_id: 'META_AD_ACCOUNT_ID',
  google_lead_webhook_key: 'GOOGLE_LEAD_WEBHOOK_KEY',
  google_ads_client_id: 'GOOGLE_ADS_CLIENT_ID',
  google_ads_client_secret: 'GOOGLE_ADS_CLIENT_SECRET',
  google_ads_refresh_token: 'GOOGLE_ADS_REFRESH_TOKEN',
  google_ads_developer_token: 'GOOGLE_ADS_DEVELOPER_TOKEN',
  google_ads_customer_id: 'GOOGLE_ADS_CUSTOMER_ID',
  google_ads_login_customer_id: 'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
}

const voiceSettings = [
  { key: 'mcube_api_token', field: 'apiToken', env: 'MCUBE_API_TOKEN', secret: true },
  { key: 'mcube_agent_phone_number', field: 'agentNumber', env: 'MCUBE_AGENT_PHONE_NUMBER' },
  { key: 'mcube_click_to_call_url', field: 'url', env: 'MCUBE_CLICK_TO_CALL_URL' },
  { key: 'mcube_api_token_field', field: 'tokenField', env: 'MCUBE_API_TOKEN_FIELD' },
  { key: 'mcube_api_token_prefix', field: 'tokenPrefix', env: 'MCUBE_API_TOKEN_PREFIX' },
  { key: 'mcube_agent_field', field: 'agentField', env: 'MCUBE_AGENT_FIELD' },
  { key: 'mcube_customer_field', field: 'customerField', env: 'MCUBE_CUSTOMER_FIELD' },
  { key: 'mcube_did_field', field: 'didField', env: 'MCUBE_DID_FIELD' },
  { key: 'mcube_refurl_field', field: 'refurlField', env: 'MCUBE_REFURL_FIELD' },
  { key: 'mcube_refurl', field: 'refurl', env: 'MCUBE_REFURL' },
  { key: 'mcube_call_release_token', field: 'callReleaseToken', env: 'MCUBE_CALL_RELEASE_TOKEN', secret: true },
]

const twilioWhatsAppSettings = [
  { key: 'twilio_account_sid', field: 'accountSid', env: 'TWILIO_ACCOUNT_SID' },
  { key: 'twilio_auth_token', field: 'authToken', env: 'TWILIO_AUTH_TOKEN', secret: true },
  { key: 'twilio_api_key_sid', field: 'apiKeySid', env: 'TWILIO_API_KEY_SID' },
  { key: 'twilio_api_key_secret', field: 'apiKeySecret', env: 'TWILIO_API_KEY_SECRET', secret: true },
  { key: 'twilio_phone_number', field: 'phoneNumber', env: 'TWILIO_PHONE_NUMBER' },
  { key: 'twilio_whatsapp_template_sid', field: 'templateSid', env: 'TWILIO_WHATSAPP_TEMPLATE_SID' },
]

router.get('/', async (req, res) => {
  try {
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes((req as AuthRequest).user?.role || '')
    const settings = await prisma.settings.findMany({
      where: isAdmin
        ? { key: { notIn: ['smtp_pass', 'wa_access_token', ...adsSecretKeys] } }
        : { key: { in: ['company_name', 'logo_url', 'accent_color'] } },
    })
    const map = settings.reduce((acc: any, s) => { acc[s.key] = s.value; return acc }, {})
    res.json({ success: true, data: map })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to fetch settings' }) }
})

router.get('/ads', authorize('SUPER_ADMIN', 'ADMIN'), async (_req, res) => {
  try {
    const settings = await prisma.settings.findMany({ where: { key: { in: adsSettingKeys } } })
    const storedValues = settings.reduce((result: Record<string, string>, item) => {
      result[item.key] = item.value
      return result
    }, {})
    const configuredValues = adsSettingKeys.reduce((result: Record<string, string>, key) => {
      result[key] = storedValues[key] || process.env[adsEnvironmentKeys[key]] || ''
      return result
    }, {})
    const values = adsSettingKeys.reduce((result: Record<string, string>, key) => {
      result[key] = adsSecretKeys.includes(key) ? (configuredValues[key] ? '********' : '') : configuredValues[key]
      return result
    }, {})
    const has = (key: string) => Boolean(configuredValues[key])
    res.json({ success: true, data: {
      ...values,
      metaActive: has('meta_lead_access_token') && has('meta_ads_access_token') && has('meta_ad_account_id'),
      googleActive: has('google_ads_client_id') && has('google_ads_client_secret') && has('google_ads_refresh_token') && has('google_ads_developer_token') && has('google_ads_customer_id'),
    } })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to fetch Ads settings' }) }
})

router.post('/ads', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const values = req.body || {}
    await Promise.all(adsSettingKeys.map(key => {
      const value = typeof values[key] === 'string' ? values[key].trim() : ''
      if (!value || value === '********') return Promise.resolve()
      return prisma.settings.upsert({
        where: { key },
        update: { value, group: 'ads' },
        create: { key, value, group: 'ads' },
      })
    }))
    res.json({ success: true, message: 'Ads credentials saved and integrations activated' })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to save Ads credentials' }) }
})

router.get('/voice', authorize('SUPER_ADMIN', 'ADMIN'), async (_req, res) => {
  try {
    const settings = await prisma.settings.findMany({
      where: { key: { in: [...voiceSettings.map(item => item.key), 'mcube_incoming_routes', 'mcube_outgoing_dids'] } },
    })
    const values = settings.reduce((result: Record<string, string>, item) => {
      result[item.key] = item.value
      return result
    }, {})
    const data = voiceSettings.reduce((result: Record<string, unknown>, item) => {
      const value = values[item.key] || process.env[item.env] || ''
      result[item.field] = item.secret ? '' : value
      if (item.field === 'apiToken') result.hasApiToken = Boolean(value)
      if (item.field === 'callReleaseToken') result.hasCallReleaseToken = Boolean(value)
      return result
    }, {})
    data.incomingRoutes = parseIncomingCallRoutes(values.mcube_incoming_routes)
    data.outgoingDids = parseOutgoingDidRoutes(values.mcube_outgoing_dids)
    data.url = data.url || 'https://api.mcube.com/Restmcube-api/outbound-calls'
    data.tokenField = data.tokenField || 'HTTP_AUTHORIZATION'
    data.agentField = data.agentField || 'exenumber'
    data.customerField = data.customerField || 'custnumber'
    data.didField = data.didField || 'did'
    data.refurlField = data.refurlField || 'refurl'
    data.refurl = data.refurl || '1'
    data.configured = Boolean(data.hasApiToken && data.agentNumber)
    res.json({ success: true, data })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch call API settings' })
  }
})

router.get('/email', authorize('SUPER_ADMIN', 'ADMIN'), async (_req, res) => {
  try {
    const settings = await prisma.settings.findMany({
      where: { key: { in: ['smtp_user', 'smtp_pass', 'from_name'] } },
      select: { key: true, value: true },
    })
    const values = settings.reduce((result: Record<string, string>, setting) => {
      result[setting.key] = setting.value
      return result
    }, {})
    res.json({
      success: true,
      data: {
        smtpUser: values.smtp_user || process.env.SMTP_USER || process.env.GMAIL_USER || '',
        fromName: values.from_name || process.env.FROM_NAME || 'Aarovia Real Estates',
        hasSmtpPassword: Boolean(values.smtp_pass || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD),
      },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch email configuration' })
  }
})

router.post('/voice', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const body = req.body || {}
    const incomingRoutes = body.incomingRoutes === undefined ? undefined : validateIncomingCallRoutes(body.incomingRoutes)
    const outgoingDids = body.outgoingDids === undefined ? undefined : validateOutgoingDidRoutes(body.outgoingDids)
    const currentToken = await prisma.settings.findUnique({ where: { key: 'mcube_api_token' } })
    const token = typeof body.apiToken === 'string' && body.apiToken.trim() && body.apiToken !== '********'
      ? body.apiToken.trim()
      : currentToken?.value || process.env.MCUBE_API_TOKEN || ''
    const agentNumber = typeof body.agentNumber === 'string' && body.agentNumber.trim()
      ? body.agentNumber.trim()
      : process.env.MCUBE_AGENT_PHONE_NUMBER || ''

    if (!token || !agentNumber) {
      return res.status(400).json({ success: false, message: 'MCUBE API token and agent phone number are required' })
    }

    const updates = voiceSettings.map(item => {
      const submitted = body[item.field]
      if (item.secret) {
        if (typeof submitted !== 'string' || !submitted.trim() || submitted === '********') return Promise.resolve()
        return prisma.settings.upsert({
          where: { key: item.key },
          update: { value: submitted.trim(), group: 'voice' },
          create: { key: item.key, value: submitted.trim(), group: 'voice' },
        })
      }
      if (typeof submitted !== 'string') return Promise.resolve()
      return prisma.settings.upsert({
        where: { key: item.key },
        update: { value: submitted.trim(), group: 'voice' },
        create: { key: item.key, value: submitted.trim(), group: 'voice' },
      })
    })
    if (incomingRoutes !== undefined) {
      updates.push(prisma.settings.upsert({
        where: { key: 'mcube_incoming_routes' },
        update: { value: JSON.stringify(incomingRoutes), group: 'voice' },
        create: { key: 'mcube_incoming_routes', value: JSON.stringify(incomingRoutes), group: 'voice' },
      }))
    }
    if (outgoingDids !== undefined) {
      updates.push(prisma.settings.upsert({
        where: { key: 'mcube_outgoing_dids' },
        update: { value: JSON.stringify(outgoingDids), group: 'voice' },
        create: { key: 'mcube_outgoing_dids', value: JSON.stringify(outgoingDids), group: 'voice' },
      }))
    }
    await Promise.all(updates)

    const callReleaseToken = await prisma.settings.findUnique({ where: { key: 'mcube_call_release_token' } })
    res.json({
      success: true,
      data: {
        hasApiToken: Boolean(token),
        hasCallReleaseToken: Boolean(callReleaseToken?.value || process.env.MCUBE_CALL_RELEASE_TOKEN),
        configured: true,
      },
      message: 'Call API settings saved',
    })
  } catch (error) {
    if (error instanceof Error && (
      error.message.startsWith('Incoming call routes')
      || error.message.startsWith('Incoming route ')
      || error.message.startsWith('Incoming number ')
      || error.message.startsWith('Outgoing DID routes ')
      || error.message.startsWith('Outgoing DID route ')
      || error.message.startsWith('Outgoing DID for ')
    )) {
      return res.status(400).json({ success: false, message: error.message })
    }
    res.status(500).json({ success: false, message: 'Failed to save call API settings' })
  }
})

router.post('/email', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const submittedUser = req.body.smtpUser || req.body.gmailUser
    const submittedPassword = req.body.smtpPassword || req.body.gmailAppPassword
    const existing = await prisma.settings.findMany({
      where: { key: { in: ['smtp_user', 'smtp_pass'] } },
      select: { key: true, value: true },
    })
    const existingValues = existing.reduce((result: Record<string, string>, setting) => {
      result[setting.key] = setting.value
      return result
    }, {})
    const smtpUser = typeof submittedUser === 'string' && submittedUser.trim()
      ? submittedUser.trim()
      : existingValues.smtp_user || process.env.SMTP_USER || process.env.GMAIL_USER || ''
    const smtpPassword = typeof submittedPassword === 'string' && submittedPassword
      ? submittedPassword
      : existingValues.smtp_pass || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || ''
    const fromName = typeof req.body.fromName === 'string' && req.body.fromName.trim()
      ? req.body.fromName.trim()
      : 'Aarovia Real Estates'
    if (!smtpUser || !smtpPassword) {
      return res.status(400).json({ success: false, message: 'SMTP username and password are required' })
    }
    const updates = [
      prisma.settings.upsert({ where: { key: 'smtp_user' }, update: { value: smtpUser.trim() }, create: { key: 'smtp_user', value: smtpUser.trim(), group: 'email' } }),
      prisma.settings.upsert({ where: { key: 'from_name' }, update: { value: fromName }, create: { key: 'from_name', value: fromName, group: 'email' } }),
      prisma.settings.deleteMany({ where: { key: { in: ['gmail_user', 'gmail_app_password'] } } }),
    ]
    if (typeof submittedPassword === 'string' && submittedPassword) {
      updates.push(prisma.settings.upsert({
        where: { key: 'smtp_pass' },
        update: { value: submittedPassword },
        create: { key: 'smtp_pass', value: submittedPassword, group: 'email' },
      }))
    }
    await Promise.all(updates)
    res.json({
      success: true,
      data: { smtpUser, fromName, hasSmtpPassword: true },
      message: 'Email configuration saved',
    })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to save email config' }) }
})

router.get('/sms/twilio', authorize('SUPER_ADMIN', 'ADMIN'), async (_req, res) => {
  try {
    const config = await getSmsConfig()
    res.json({ success: true, data: {
      accountSid: config.accountSid,
      apiKeySid: config.apiKeySid,
      phoneNumber: config.phoneNumber,
      messagingServiceSid: config.messagingServiceSid,
      authTokenConfigured: Boolean(config.authToken),
      apiKeySecretConfigured: Boolean(config.apiKeySecret),
      configured: Boolean(config.accountSid && (config.phoneNumber || config.messagingServiceSid) && (config.authToken || (config.apiKeySid && config.apiKeySecret))),
    } })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch Twilio SMS settings' })
  }
})

router.post('/sms/twilio', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const body = req.body || {}
    const current = await getSmsConfig()
    const proposed = { ...current }
    for (const item of smsSettingFields) {
      const submitted = typeof body[item.field] === 'string' ? body[item.field].trim() : ''
      if (!process.env[item.env] && (typeof body[item.field] === 'string') && (!item.secret || submitted)) {
        proposed[item.field] = submitted
      }
    }
    const configured = Boolean(proposed.accountSid && (proposed.phoneNumber || proposed.messagingServiceSid) && (proposed.authToken || (proposed.apiKeySid && proposed.apiKeySecret)))
    if (!configured) {
      return res.status(400).json({ success: false, message: 'Twilio Account SID, sender number or Messaging Service SID, and Auth Token or API key pair are required' })
    }

    const updates = smsSettingFields.map(item => {
      const submitted = typeof body[item.field] === 'string' ? body[item.field].trim() : ''
      if (item.secret && !submitted) return Promise.resolve()
      if (typeof body[item.field] !== 'string') return Promise.resolve()
      return prisma.settings.upsert({
        where: { key: item.key },
        update: { value: submitted, group: 'sms' },
        create: { key: item.key, value: submitted, group: 'sms' },
      })
    })
    await Promise.all(updates)
    res.json({ success: true, data: { configured }, message: 'Twilio SMS settings saved' })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to save Twilio SMS settings' })
  }
})

router.get('/whatsapp', authorize('SUPER_ADMIN', 'ADMIN'), async (_req, res) => {
  try {
    const settings = await prisma.settings.findMany({
      where: { key: { in: [
        'wa_provider', 'wa_phone_id', 'wa_access_token', 'wa_business_id', 'wa_template_name', 'wa_allow_raw_text',
        ...twilioWhatsAppSettings.map(item => item.key),
      ] } },
    })
    const values = settings.reduce((result: Record<string, string>, item) => {
      result[item.key] = item.value
      return result
    }, {})
    const phoneId = process.env.WHATSAPP_PHONE_ID || values.wa_phone_id || ''
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || values.wa_access_token || ''
    const twilioConfigured = Boolean(
      (process.env.TWILIO_ACCOUNT_SID || values.twilio_account_sid)
      && (process.env.TWILIO_AUTH_TOKEN || values.twilio_auth_token || (process.env.TWILIO_API_KEY_SID || values.twilio_api_key_sid) && (process.env.TWILIO_API_KEY_SECRET || values.twilio_api_key_secret))
      && (process.env.TWILIO_PHONE_NUMBER || values.twilio_phone_number),
    )
    const provider = (
      process.env.WHATSAPP_PROVIDER
      || values.wa_provider
      || (phoneId && accessToken ? 'META' : twilioConfigured ? 'TWILIO' : 'META')
    ).toUpperCase()
    res.json({ success: true, data: {
      phoneId,
      hasAccessToken: Boolean(accessToken),
      businessId: process.env.WHATSAPP_BUSINESS_ID || values.wa_business_id || '',
      templateName: process.env.WHATSAPP_TEMPLATE_NAME || values.wa_template_name || '',
      allowRawText: values.wa_allow_raw_text === 'true',
      configured: Boolean(phoneId && accessToken),
      provider,
      providerLocked: Boolean(process.env.WHATSAPP_PROVIDER),
    } })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch WhatsApp settings' })
  }
})

router.post('/whatsapp', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const body = req.body || {}
    if (process.env.WHATSAPP_PROVIDER && process.env.WHATSAPP_PROVIDER.toUpperCase() !== 'META') {
      return res.status(400).json({ success: false, message: 'Provider is locked by the WHATSAPP_PROVIDER environment variable' })
    }
    const currentAccessToken = await prisma.settings.findUnique({ where: { key: 'wa_access_token' } })
    const currentPhoneId = await prisma.settings.findUnique({ where: { key: 'wa_phone_id' } })
    const submittedPhoneId = typeof body.phoneId === 'string' ? body.phoneId.trim() : ''
    const submittedAccessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : ''
    const phoneId = process.env.WHATSAPP_PHONE_ID || submittedPhoneId || currentPhoneId?.value || ''
    const nextAccessToken = process.env.WHATSAPP_ACCESS_TOKEN || submittedAccessToken || currentAccessToken?.value || ''
    if (!phoneId || !nextAccessToken) {
      return res.status(400).json({ success: false, message: 'Meta WhatsApp Phone Number ID and Access Token are required' })
    }
    await Promise.all([
      prisma.settings.upsert({ where: { key: 'wa_phone_id' }, update: { value: phoneId }, create: { key: 'wa_phone_id', value: phoneId, group: 'whatsapp' } }),
      prisma.settings.upsert({ where: { key: 'wa_access_token' }, update: { value: nextAccessToken }, create: { key: 'wa_access_token', value: nextAccessToken, group: 'whatsapp' } }),
      prisma.settings.upsert({ where: { key: 'wa_business_id' }, update: { value: body.businessId || '' }, create: { key: 'wa_business_id', value: body.businessId || '', group: 'whatsapp' } }),
      prisma.settings.upsert({ where: { key: 'wa_template_name' }, update: { value: body.templateName || '' }, create: { key: 'wa_template_name', value: body.templateName || '', group: 'whatsapp' } }),
      prisma.settings.upsert({ where: { key: 'wa_allow_raw_text' }, update: { value: String(body.allowRawText === true || body.allowRawText === 'true') }, create: { key: 'wa_allow_raw_text', value: String(body.allowRawText === true || body.allowRawText === 'true'), group: 'whatsapp' } }),
      prisma.settings.upsert({ where: { key: 'wa_provider' }, update: { value: 'META', group: 'whatsapp' }, create: { key: 'wa_provider', value: 'META', group: 'whatsapp' } }),
    ])
    res.json({ success: true, data: { hasAccessToken: Boolean(nextAccessToken), provider: 'META' }, message: 'Meta WhatsApp API settings saved' })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to save WhatsApp config' }) }
})

router.get('/whatsapp/twilio', authorize('SUPER_ADMIN', 'ADMIN'), async (_req, res) => {
  try {
    const keys = ['wa_provider', 'wa_phone_id', 'wa_access_token', ...twilioWhatsAppSettings.map(item => item.key)]
    const settings = await prisma.settings.findMany({ where: { key: { in: keys } } })
    const values = settings.reduce((result: Record<string, string>, item) => {
      result[item.key] = item.value
      return result
    }, {})
    const getValue = (key: string, env: string) => process.env[env] || values[key] || ''
    const accountSid = getValue('twilio_account_sid', 'TWILIO_ACCOUNT_SID')
    const authToken = getValue('twilio_auth_token', 'TWILIO_AUTH_TOKEN')
    const apiKeySid = getValue('twilio_api_key_sid', 'TWILIO_API_KEY_SID')
    const apiKeySecret = getValue('twilio_api_key_secret', 'TWILIO_API_KEY_SECRET')
    const phoneNumber = getValue('twilio_phone_number', 'TWILIO_PHONE_NUMBER')
    const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_SID
      || process.env.TWILIO_TEMPLATE_SID
      || values.twilio_whatsapp_template_sid
      || ''
    const provider = (process.env.WHATSAPP_PROVIDER || values.wa_provider || '').toUpperCase()
    const credentialsConfigured = Boolean(accountSid && (authToken || (apiKeySid && apiKeySecret)) && phoneNumber)
    const metaConfigured = Boolean(
      (process.env.WHATSAPP_PHONE_ID || values.wa_phone_id)
      && (process.env.WHATSAPP_ACCESS_TOKEN || values.wa_access_token),
    )
    res.json({ success: true, data: {
      provider: provider || (metaConfigured ? 'META' : credentialsConfigured ? 'TWILIO' : 'META'),
      providerLocked: Boolean(process.env.WHATSAPP_PROVIDER),
      accountSid,
      authTokenConfigured: Boolean(authToken),
      apiKeySid,
      apiKeySecretConfigured: Boolean(apiKeySecret),
      phoneNumber,
      templateSid,
      configured: credentialsConfigured,
    } })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch Twilio WhatsApp settings' })
  }
})

router.post('/whatsapp/twilio', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const body = req.body || {}
    if (process.env.WHATSAPP_PROVIDER && process.env.WHATSAPP_PROVIDER.toUpperCase() !== 'TWILIO') {
      return res.status(400).json({ success: false, message: 'Provider is locked by the WHATSAPP_PROVIDER environment variable' })
    }

    const keys = ['wa_provider', ...twilioWhatsAppSettings.map(item => item.key)]
    const settings = await prisma.settings.findMany({ where: { key: { in: keys } } })
    const current = settings.reduce((result: Record<string, string>, item) => {
      result[item.key] = item.value
      return result
    }, {})
    const getValue = (field: string, key: string, env: string) => {
      const submitted = typeof body[field] === 'string' ? body[field].trim() : ''
      return process.env[env] || submitted || current[key] || ''
    }
    const accountSid = getValue('accountSid', 'twilio_account_sid', 'TWILIO_ACCOUNT_SID')
    const authToken = getValue('authToken', 'twilio_auth_token', 'TWILIO_AUTH_TOKEN')
    const apiKeySid = getValue('apiKeySid', 'twilio_api_key_sid', 'TWILIO_API_KEY_SID')
    const apiKeySecret = getValue('apiKeySecret', 'twilio_api_key_secret', 'TWILIO_API_KEY_SECRET')
    const phoneNumber = getValue('phoneNumber', 'twilio_phone_number', 'TWILIO_PHONE_NUMBER')

    if (!(accountSid && (authToken || (apiKeySid && apiKeySecret)) && phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Twilio Account SID, WhatsApp sender, and Auth Token or API key pair are required' })
    }

    const upserts = [prisma.settings.upsert({
      where: { key: 'wa_provider' },
      update: { value: 'TWILIO', group: 'whatsapp' },
      create: { key: 'wa_provider', value: 'TWILIO', group: 'whatsapp' },
    })]
    for (const item of twilioWhatsAppSettings) {
      const submitted = typeof body[item.field] === 'string' ? body[item.field].trim() : ''
      if (item.secret && (!submitted || submitted === '********')) continue
      if (!item.secret && typeof body[item.field] !== 'string') continue
      const value = process.env[item.env] || submitted
      if (!value) continue
      upserts.push(prisma.settings.upsert({
        where: { key: item.key },
        update: { value, group: 'whatsapp-twilio' },
        create: { key: item.key, value, group: 'whatsapp-twilio' },
      }))
    }
    await Promise.all(upserts)
    res.json({ success: true, data: { provider: 'TWILIO', configured: true }, message: 'Twilio WhatsApp settings saved' })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to save Twilio WhatsApp settings' })
  }
})

router.post('/branding', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { companyName, domain, logoUrl, accentColor } = req.body
    await Promise.all([
      prisma.settings.upsert({ where: { key: 'company_name' }, update: { value: companyName }, create: { key: 'company_name', value: companyName, group: 'branding' } }),
      prisma.settings.upsert({ where: { key: 'crm_domain' }, update: { value: domain }, create: { key: 'crm_domain', value: domain, group: 'branding' } }),
      prisma.settings.upsert({ where: { key: 'logo_url' }, update: { value: logoUrl || '' }, create: { key: 'logo_url', value: logoUrl || '', group: 'branding' } }),
      prisma.settings.upsert({ where: { key: 'accent_color' }, update: { value: accentColor }, create: { key: 'accent_color', value: accentColor, group: 'branding' } }),
    ])
    res.json({ success: true, message: 'Branding saved' })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to save branding' }) }
})

export default router
