import { Router } from 'express'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import { authenticate, authorize } from '../middleware/auth.middleware'
import prisma from '../utils/prisma'
import { getGoogleCampaignMetrics, getMetaCampaignMetrics, importGoogleLead, importMetaLead, setting } from '../services/ad-integrations.service'

const router = Router()

const frontendUrl = () => (process.env.FRONTEND_URL || 'https://www.aarovia.co.in').split(',')[0].replace(/\/$/, '')
const apiUrl = () => (process.env.API_URL || 'https://aarovia-api.vercel.app').replace(/\/$/, '')
const oauthState = (provider: string, userId: string) => {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET must be configured')
  return jwt.sign({ provider, userId, purpose: 'ads-oauth' }, secret, { expiresIn: '10m' })
}
const readOAuthState = (value: string) => {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET must be configured')
  return jwt.verify(value, secret) as { provider: string; purpose: string }
}

router.get('/meta/connect', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req: any, res) => {
  const appId = await setting('meta_app_id') || process.env.META_APP_ID
  if (!appId) return res.status(503).json({ success: false, message: 'Meta OAuth is not configured' })
  const redirectUri = `${apiUrl()}/api/ad-integrations/meta/callback`
  const url = new URL('https://www.facebook.com/v20.0/dialog/oauth')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', oauthState('meta', req.user.id))
  url.searchParams.set('scope', 'leads_retrieval,ads_read,pages_read_engagement,pages_manage_metadata')
  res.json({ success: true, data: { url: url.toString() } })
})

router.get('/google/connect', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req: any, res) => {
  const clientId = await setting('google_ads_client_id') || process.env.GOOGLE_ADS_CLIENT_ID
  if (!clientId) return res.status(503).json({ success: false, message: 'Google OAuth is not configured' })
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', `${apiUrl()}/api/ad-integrations/google/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', oauthState('google', req.user.id))
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/adwords')
  res.json({ success: true, data: { url: url.toString() } })
})

router.get('/meta/callback', async (req, res) => {
  try {
    const state = readOAuthState(String(req.query.state || ''))
    if (state.provider !== 'meta') throw new Error('Invalid Meta OAuth state')
    const response = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', { params: {
      client_id: await setting('meta_app_id') || process.env.META_APP_ID,
      client_secret: await setting('meta_app_secret') || process.env.META_APP_SECRET,
      redirect_uri: `${apiUrl()}/api/ad-integrations/meta/callback`,
      code: req.query.code,
    } })
    await prisma.settings.upsert({ where: { key: 'meta_ads_access_token' }, update: { value: response.data.access_token }, create: { key: 'meta_ads_access_token', value: response.data.access_token, group: 'ads' } })
    await prisma.settings.upsert({ where: { key: 'meta_lead_access_token' }, update: { value: response.data.access_token }, create: { key: 'meta_lead_access_token', value: response.data.access_token, group: 'ads' } })
    res.redirect(`${frontendUrl()}/settings?ads=connected&provider=meta`)
  } catch (error: any) {
    console.error('[Ads] Meta OAuth failed', error.response?.data || error.message)
    res.redirect(`${frontendUrl()}/settings?ads=error&provider=meta`)
  }
})

router.get('/google/callback', async (req, res) => {
  try {
    const state = readOAuthState(String(req.query.state || ''))
    if (state.provider !== 'google') throw new Error('Invalid Google OAuth state')
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: await setting('google_ads_client_id') || process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: await setting('google_ads_client_secret') || process.env.GOOGLE_ADS_CLIENT_SECRET,
      redirect_uri: `${apiUrl()}/api/ad-integrations/google/callback`,
      code: req.query.code,
      grant_type: 'authorization_code',
    })
    await prisma.settings.upsert({ where: { key: 'google_ads_refresh_token' }, update: { value: response.data.refresh_token }, create: { key: 'google_ads_refresh_token', value: response.data.refresh_token, group: 'ads' } })
    res.redirect(`${frontendUrl()}/settings?ads=connected&provider=google`)
  } catch (error: any) {
    console.error('[Ads] Google OAuth failed', error.response?.data || error.message)
    res.redirect(`${frontendUrl()}/settings?ads=error&provider=google`)
  }
})

router.get('/meta/webhook', async (req, res) => {
  const verifyToken = process.env.META_LEAD_VERIFY_TOKEN
  if (verifyToken && req.query['hub.verify_token'] === verifyToken) return res.send(req.query['hub.challenge'])
  return res.status(403).send('Forbidden')
})

router.post('/meta/webhook', async (req, res) => {
  try {
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : []
    const leadIds = entries.flatMap((entry: any) => entry.changes || [])
      .map((change: any) => change.value?.leadgen_id).filter(Boolean)
    await Promise.all(leadIds.map((id: string) => importMetaLead(id)))
    return res.sendStatus(200)
  } catch (error: any) {
    console.error('[Ads] Meta lead webhook failed', error.response?.data || error.message)
    return res.sendStatus(200)
  }
})

router.post('/google/webhook', async (req, res) => {
  if (process.env.GOOGLE_LEAD_WEBHOOK_KEY && req.query.key !== process.env.GOOGLE_LEAD_WEBHOOK_KEY) return res.sendStatus(403)
  try {
    await importGoogleLead(req.body)
    return res.sendStatus(200)
  } catch (error: any) {
    console.error('[Ads] Google lead webhook failed', error.response?.data || error.message)
    return res.sendStatus(500)
  }
})

router.use(authenticate)
router.get('/campaigns', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'), async (_req, res) => {
  try {
    const [meta, google] = await Promise.allSettled([getMetaCampaignMetrics(), getGoogleCampaignMetrics()])
    res.json({ success: true, data: {
      meta: meta.status === 'fulfilled' ? meta.value : [],
      google: google.status === 'fulfilled' ? google.value : [],
      errors: [meta, google].filter(result => result.status === 'rejected').map(result => (result as PromiseRejectedResult).reason?.message),
    } })
  } catch (error: any) { res.status(502).json({ success: false, message: error.message || 'Failed to fetch ad campaigns' }) }
})

export default router