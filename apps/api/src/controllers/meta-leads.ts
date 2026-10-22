import { createHmac, timingSafeEqual } from 'crypto'
import { Request, Response } from 'express'
import axios, { AxiosResponse } from 'axios'
import { Prisma } from '@prisma/client'
import prisma from '../utils/prisma'
import { notifyManagersOfNewLeads } from '../services/notification.service'

type MetaLeadField = { name?: string; values?: string[] }
export type MetaLeadDetails = {
  id: string
  created_time?: string
  field_data?: MetaLeadField[]
  ad_id?: string
  ad_name?: string
  adset_id?: string
  adset_name?: string
  campaign_id?: string
  campaign_name?: string
  form_id?: string
  platform?: string
}

export type MetaLeadEvent = {
  leadgen_id: string
  page_id?: string
  form_id?: string
  ad_id?: string
  created_time?: number | string
}

const graphBase = 'https://graph.facebook.com/v21.0'
const leadFields = 'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,platform'

export const normalizeMetaPhone = (value: string) => {
  let digits = value.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : value.trim()
}

const settingValue = async (key: string, environmentKey: string) => {
  const setting = await prisma.settings.findUnique({ where: { key }, select: { value: true } })
  return setting?.value || process.env[environmentKey] || ''
}

const getMetaLeadAppConfig = async (slot: 1 | 2) => {
  const suffix = slot === 1 ? '' : '_2'
  const envSuffix = slot === 1 ? '' : '_2'
  const [appId, appSecret, verifyToken, accessToken] = await Promise.all([
    settingValue(`meta_app_id${suffix}`, `META_APP_ID${envSuffix}`),
    settingValue(`meta_app_secret${suffix}`, `META_APP_SECRET${envSuffix}`),
    settingValue(`meta_lead_verify_token${suffix}`, `META_LEAD_VERIFY_TOKEN${envSuffix}`),
    settingValue(`meta_lead_access_token${suffix}`, `META_LEAD_ACCESS_TOKEN${envSuffix}`),
  ])
  return { slot, appId, appSecret, verifyToken, accessToken }
}

const getMetaLeadAppSlot = (req: Request): 1 | 2 =>
  req.body?.appSlot === 2 || req.query?.appSlot === '2' ? 2 : 1

export const extractMetaLeadFields = (fields: MetaLeadField[] = []) => {
  const values = new Map<string, string>()
  for (const field of fields) {
    if (field.name && field.values?.[0]) values.set(field.name.toLowerCase(), field.values[0].trim())
  }

  const name = values.get('full_name')
    || [values.get('first_name'), values.get('last_name')].filter(Boolean).join(' ')

  return {
    name: name || 'Unknown',
    phone: values.get('phone_number') || values.get('phone') || values.get('mobile') || '',
    email: values.get('email') || null,
    city: values.get('city') || null,
  }
}

export const parseMetaLeadEvents = (payload: {
  entry?: Array<{ changes?: Array<{ field?: string; value?: MetaLeadEvent }> }>
}) => (payload.entry || []).flatMap(entry =>
  (entry.changes || [])
    .filter(change => change.field === 'leadgen' && Boolean(change.value?.leadgen_id))
    .map(change => change.value as MetaLeadEvent),
)

export const isMetaSignatureValid = (body: Buffer, signature: string, appSecret: string) => {
  if (!signature || !appSecret) return false
  const expected = Buffer.from(`sha256=${createHmac('sha256', appSecret).update(body).digest('hex')}`)
  const received = Buffer.from(signature)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export const matchMetaLeadAppSignature = <T extends { appSecret: string }>(
  body: Buffer,
  signature: string,
  apps: T[],
) => apps.find(app => isMetaSignatureValid(body, signature, app.appSecret))

const graphError = (error: unknown) => {
  if (!axios.isAxiosError(error)) return null
  const graph = error.response?.data?.error
  return graph && typeof graph === 'object'
    ? {
        code: graph.code as number | undefined,
        subcode: graph.error_subcode as number | undefined,
        message: graph.message as string | undefined,
      }
    : null
}

export const logGraphError = (context: string, error: unknown) => {
  const details = graphError(error)
  if (details) {
    if (details.code === 190) {
      console.error(`[Meta Lead] ${context}: Graph API token expired or invalid (190)`)
    } else if (details.code === 200 || details.code === 10) {
      console.error(`[Meta Lead] ${context}: Graph API permission denied (${details.code})`)
    } else {
      console.error(`[Meta Lead] ${context}: Graph API error`, details.code || 'unknown', details.message || '')
    }
    return
  }
  console.error(`[Meta Lead] ${context}: Graph API request failed`, error instanceof Error ? error.name : 'unknown error')
}

const updateWebhookLog = async (
  id: string,
  values: { status: string; signatureValid?: boolean | null; error?: string | null; leadId?: string | null },
) => prisma.metaWebhookLog.update({ where: { id }, data: values })

const reportWebhookLogFailure = async (id: string, status: string, message: string) => {
  try {
    await updateWebhookLog(id, { status, error: message })
  } catch (error) {
    console.error('[Meta Lead] Failed to update webhook event log', error instanceof Error ? error.name : 'unknown error')
  }
}

export const storeMetaLead = async (
  details: MetaLeadDetails,
  context: { formId?: string; adId?: string; pageId?: string; createdTime?: number | string; webhookLogId?: string },
) => {
  if (!details.id) throw new Error('Meta lead response did not contain an ID')

  const existing = await prisma.lead.findUnique({
    where: { metaLeadId: details.id },
    select: { id: true },
  })
  if (existing) {
    if (context.webhookLogId) {
      await updateWebhookLog(context.webhookLogId, { status: 'DUPLICATE', leadId: existing.id })
    }
    return { created: false, leadId: existing.id }
  }

  const fields = extractMetaLeadFields(details.field_data)
  if (!fields.phone) {
    if (context.webhookLogId) {
      await updateWebhookLog(context.webhookLogId, {
        status: 'SKIPPED_NO_PHONE',
        error: 'Meta lead form did not provide a phone number',
      })
    }
    return { created: false, leadId: null }
  }

  const mobile = normalizeMetaPhone(fields.phone)
  try {
    const lead = await prisma.$transaction(async transaction => {
      const created = await transaction.lead.create({
        data: {
          name: fields.name,
          mobile,
          email: fields.email?.toLowerCase() || null,
          city: fields.city,
          source: 'META_ADS',
          status: 'NEW',
          metaLeadId: details.id,
          remarks: `Meta Lead Ads form submission${details.form_id || context.formId ? ` (form ${details.form_id || context.formId})` : ''}`,
        },
        select: { id: true },
      })

      await transaction.activity.create({
        data: {
          leadId: created.id,
          type: 'LEAD_CREATED',
          description: 'Lead captured from Meta Lead Ads',
          metadata: {
            source: 'META_ADS',
            metaLeadId: details.id,
            pageId: context.pageId || null,
            formId: details.form_id || context.formId || null,
            adId: details.ad_id || context.adId || null,
            createdTime: context.createdTime || details.created_time || null,
            adName: details.ad_name || null,
            adsetId: details.adset_id || null,
            adsetName: details.adset_name || null,
            campaignId: details.campaign_id || null,
            campaignName: details.campaign_name || null,
            platform: details.platform || null,
          },
        },
      })

      if (context.webhookLogId) {
        await transaction.metaWebhookLog.update({
          where: { id: context.webhookLogId },
          data: { status: 'PROCESSED', leadId: created.id, error: null },
        })
      }
      return created
    })
    await notifyManagersOfNewLeads([{ id: lead.id, name: fields.name, mobile, source: 'META_ADS' }])
    return { created: true, leadId: lead.id }
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      const duplicate = await prisma.lead.findUnique({
        where: { metaLeadId: details.id },
        select: { id: true },
      })
      if (duplicate) {
        if (context.webhookLogId) {
          await updateWebhookLog(context.webhookLogId, { status: 'DUPLICATE', leadId: duplicate.id })
        }
        return { created: false, leadId: duplicate.id }
      }
    }
    throw error
  }
}

const fetchLeadDetails = async (leadId: string, accessToken: string) => {
  try {
    const response = await axios.get<MetaLeadDetails>(`${graphBase}/${encodeURIComponent(leadId)}`, {
      params: { fields: leadFields, access_token: accessToken },
      timeout: 10000,
    })
    return response.data
  } catch (error) {
    logGraphError(`fetching lead ${leadId}`, error)
    throw error
  }
}

export const verifyMetaLeadWebhook = async (req: Request, res: Response) => {
  let logId: string | undefined
  try {
    const query = { ...req.query, 'hub.verify_token': '[REDACTED]' }
    const rawPayload = { query }
    const log = await prisma.metaWebhookLog.create({
      data: { rawPayload, status: 'VERIFICATION_REQUEST' },
      select: { id: true },
    })
    logId = log.id

    const apps = await Promise.all([getMetaLeadAppConfig(1), getMetaLeadAppConfig(2)])
    const verifyTokens = apps.map(app => app.verifyToken).filter(Boolean)
    if (!verifyTokens.length) {
      await updateWebhookLog(log.id, { status: 'FAILED', error: 'Webhook verify token is not configured' })
      return res.sendStatus(503)
    }

    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode !== 'subscribe' || typeof token !== 'string' || !verifyTokens.includes(token) || typeof challenge !== 'string') {
      await updateWebhookLog(log.id, { status: 'REJECTED', error: 'Invalid webhook verification token or challenge' })
      return res.sendStatus(403)
    }

    await updateWebhookLog(log.id, { status: 'VERIFIED' })
    return res.status(200).type('text/plain').send(challenge)
  } catch (error) {
    if (logId) await reportWebhookLogFailure(logId, 'FAILED', 'Webhook verification failed')
    console.error('[Meta Lead] Webhook verification failed', error instanceof Error ? error.name : 'unknown error')
    return res.sendStatus(500)
  }
}

export const receiveMetaLeadWebhook = async (req: Request, res: Response) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('')
  const rawText = rawBody.toString('utf8')
  let parsedPayload: Prisma.InputJsonValue = rawText
  try {
    if (rawText) {
      const parsed: unknown = JSON.parse(rawText)
      parsedPayload = parsed === null ? { raw: rawText } : parsed as Prisma.InputJsonValue
    }
  } catch {
    parsedPayload = rawText
  }

  let logId: string | undefined
  try {
    const log = await prisma.metaWebhookLog.create({
      data: { rawPayload: parsedPayload, status: 'RECEIVED' },
      select: { id: true },
    })
    logId = log.id

    if (!Buffer.isBuffer(req.body)) {
      await updateWebhookLog(log.id, { status: 'REJECTED', signatureValid: false, error: 'Request body was not received as raw JSON' })
      return res.sendStatus(400)
    }

    const signature = req.get('x-hub-signature-256') || ''
    const apps = await Promise.all([getMetaLeadAppConfig(1), getMetaLeadAppConfig(2)])
    const matchedApp = matchMetaLeadAppSignature(rawBody, signature, apps.filter(app => app.appSecret))
    if (!matchedApp) {
      await updateWebhookLog(log.id, { status: 'REJECTED', signatureValid: false, error: 'Missing or invalid X-Hub-Signature-256' })
      return res.sendStatus(401)
    }
    await updateWebhookLog(log.id, { status: 'SIGNATURE_VALID', signatureValid: true })

    let payload: { entry?: Array<{ changes?: Array<{ field?: string; value?: MetaLeadEvent }> }> }
    try {
      payload = JSON.parse(rawText)
    } catch {
      await updateWebhookLog(log.id, { status: 'REJECTED', error: 'Request body contains invalid JSON' })
      return res.sendStatus(400)
    }

    const events = parseMetaLeadEvents(payload)
    if (!events.length) {
      await updateWebhookLog(log.id, { status: 'IGNORED', error: 'No leadgen events in payload' })
      return res.sendStatus(200)
    }

    const accessToken = matchedApp.accessToken
    if (!accessToken) {
      await updateWebhookLog(log.id, { status: 'FAILED', error: `Lead Page Access Token is not configured for Meta app ${matchedApp.slot}` })
      return res.sendStatus(500)
    }

    for (const event of events) {
      const duplicate = await prisma.lead.findUnique({
        where: { metaLeadId: event.leadgen_id },
        select: { id: true },
      })
      if (duplicate) {
        if (events.length === 1) {
          await updateWebhookLog(log.id, { status: 'DUPLICATE', leadId: duplicate.id })
        }
        continue
      }

      const details = await fetchLeadDetails(event.leadgen_id, accessToken)
      if (details.id !== event.leadgen_id) throw new Error('Meta returned a mismatched lead ID')

      const result = await storeMetaLead(details, {
        formId: event.form_id,
        adId: event.ad_id,
        pageId: event.page_id,
        createdTime: event.created_time,
        webhookLogId: events.length === 1 ? log.id : undefined,
      })
      if (!result.created) console.info(`[Meta Lead] skipped ${event.leadgen_id}: already imported or missing phone`)
    }

    if (events.length > 1) await updateWebhookLog(log.id, { status: 'PROCESSED' })
    return res.sendStatus(200)
  } catch (error) {
    const details = graphError(error)
    if (logId) {
      const message = details?.code === 190
        ? 'Graph API token expired or invalid (190)'
        : details?.code === 200 || details?.code === 10
          ? `Graph API permission denied (${details.code})`
          : 'Webhook processing failed'
      await reportWebhookLogFailure(logId, 'FAILED', message)
    }
    if (axios.isAxiosError(error)) logGraphError('processing webhook', error)
    else console.error('[Meta Lead] Webhook processing failed', error instanceof Error ? error.name : 'unknown error')
    return res.sendStatus(500)
  }
}

export const checkMetaPageToken = async (req: Request, res: Response) => {
  try {
    const { appId, appSecret, accessToken: pageToken, slot } = await getMetaLeadAppConfig(getMetaLeadAppSlot(req))
    if (!appId || !appSecret || !pageToken) {
      return res.status(400).json({ success: false, message: `Meta App ${slot} ID, App Secret, and Lead Page Access Token must be saved first.` })
    }

    const response = await axios.get(`${graphBase}/debug_token`, {
      params: { input_token: pageToken, access_token: `${appId}|${appSecret}` },
      timeout: 10000,
    })
    const data = response.data?.data || {}
    return res.json({
      success: true,
      data: {
        valid: Boolean(data.is_valid),
        type: data.type || null,
        expiresAt: data.expires_at || null,
        scopes: Array.isArray(data.scopes) ? data.scopes : [],
      },
    })
  } catch (error) {
    if (axios.isAxiosError(error)) logGraphError('checking Page access token', error)
    return res.status(502).json({ success: false, message: 'Meta token check failed. Review the API logs for the Meta error code.' })
  }
}

export const subscribeMetaPage = async (req: Request, res: Response) => {
  try {
    const { accessToken: pageToken, slot } = await getMetaLeadAppConfig(getMetaLeadAppSlot(req))
    if (!pageToken) return res.status(400).json({ success: false, message: `Lead Page Access Token for Meta app ${slot} is not configured.` })

    const page = await axios.get(`${graphBase}/me`, {
      params: { fields: 'id,name', access_token: pageToken },
      timeout: 10000,
    })
    await axios.post(`${graphBase}/${encodeURIComponent(page.data.id)}/subscribed_apps`, null, {
      params: { subscribed_fields: 'leadgen', access_token: pageToken },
      timeout: 10000,
    })
    return res.json({ success: true, message: `Lead Ads webhook subscribed for ${page.data.name || 'the connected Page'}.` })
  } catch (error) {
    if (axios.isAxiosError(error)) logGraphError('subscribing Page to leadgen', error)
    return res.status(502).json({ success: false, message: 'Unable to subscribe the Page. Check the Page token and leadgen permissions.' })
  }
}

export const getRecentMetaWebhookEvents = async (_req: Request, res: Response) => {
  try {
    const events = await prisma.metaWebhookLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: { id: true, timestamp: true, signatureValid: true, status: true, error: true, leadId: true },
    })
    return res.json({ success: true, data: events })
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to retrieve Meta webhook events.' })
  }
}

export const clearMetaWebhookEvents = async (_req: Request, res: Response) => {
  try {
    const result = await prisma.metaWebhookLog.deleteMany({})
    return res.json({ success: true, data: { deletedCount: result.count } })
  } catch (error) {
    console.error('[Meta Lead] Failed to clear webhook events', error instanceof Error ? error.name : 'unknown error')
    return res.status(500).json({ success: false, message: 'Unable to clear Meta webhook events.' })
  }
}

export const runMetaLeadBackfill = async (req: Request, res: Response) => {
  const cronSecret = process.env.CRON_SECRET || ''
  const supplied = req.get('authorization') || ''
  const expected = Buffer.from(`Bearer ${cronSecret}`)
  const received = Buffer.from(supplied)
  if (!cronSecret || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    try {
      await prisma.metaWebhookLog.create({
        data: { rawPayload: { source: 'daily-cron' }, status: 'CRON_REJECTED', error: 'Invalid CRON_SECRET bearer token' },
      })
    } catch (error) {
      console.error('[Meta Lead] Failed to log rejected cron request', error instanceof Error ? error.name : 'unknown error')
    }
    return res.sendStatus(401)
  }

  let logId: string | undefined
  try {
    const log = await prisma.metaWebhookLog.create({
      data: { rawPayload: { source: 'daily-cron' }, status: 'CRON_RUNNING' },
      select: { id: true },
    })
    logId = log.id

    let imported = 0
    const apps = await Promise.all([getMetaLeadAppConfig(1), getMetaLeadAppConfig(2)])
    const appsWithTokens = apps.filter(app => app.accessToken)
    if (!appsWithTokens.length) throw new Error('No Meta Lead Ads Page Access Token is configured')
    const failedApps: number[] = []

    for (const app of appsWithTokens) {
      try {
        const page = await axios.get(`${graphBase}/me`, {
          params: { fields: 'id', access_token: app.accessToken },
          timeout: 10000,
        })
        let formsUrl: string | undefined = `${graphBase}/${encodeURIComponent(page.data.id)}/leadgen_forms`

        while (formsUrl) {
          const formsResponse: AxiosResponse<{ data?: Array<{ id: string; name?: string }>; paging?: { next?: string } }> = await axios.get(formsUrl, {
            params: formsUrl.includes('/leadgen_forms')
              ? { fields: 'id,name', limit: 100, access_token: app.accessToken }
              : undefined,
            timeout: 10000,
          })
          for (const form of formsResponse.data?.data || []) {
            let leadsUrl: string | undefined = `${graphBase}/${encodeURIComponent(form.id)}/leads`
            while (leadsUrl) {
              const leadsResponse: AxiosResponse<{ data?: MetaLeadDetails[]; paging?: { next?: string } }> = await axios.get(leadsUrl, {
                params: leadsUrl.includes('/leads')
                  ? { fields: leadFields, limit: 100, access_token: app.accessToken }
                  : undefined,
                timeout: 10000,
              })
              for (const lead of leadsResponse.data?.data || []) {
                const result = await storeMetaLead(lead, { formId: form.id })
                if (result.created) imported += 1
              }
              leadsUrl = leadsResponse.data?.paging?.next
            }
          }
          formsUrl = formsResponse.data?.paging?.next
        }
      } catch (error) {
        if (!axios.isAxiosError(error)) throw error
        failedApps.push(app.slot)
        logGraphError(`running daily lead backfill for app ${app.slot}`, error)
      }
    }

    if (failedApps.length === appsWithTokens.length) throw new Error('Meta lead backfill failed for all configured apps')
    if (logId) {
      await updateWebhookLog(logId, {
        status: failedApps.length ? 'CRON_PARTIAL' : 'CRON_PROCESSED',
        error: failedApps.length ? `Backfill failed for Meta app(s): ${failedApps.join(', ')}` : null,
      })
    }
    return res.json({ success: true, imported, failedApps })
  } catch (error) {
    if (logId) await reportWebhookLogFailure(logId, 'CRON_FAILED', 'Meta lead backfill failed')
    if (axios.isAxiosError(error)) logGraphError('running daily lead backfill', error)
    else console.error('[Meta Lead] Daily backfill failed', error instanceof Error ? error.name : 'unknown error')
    return res.status(500).json({ success: false, message: 'Meta lead backfill failed.' })
  }
}
