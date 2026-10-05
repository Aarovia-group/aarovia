import axios from 'axios'
import prisma from '../utils/prisma'

type LeadInput = {
  name: string
  mobile?: string
  email?: string
  city?: string
  campaignId?: string
  campaignName?: string
  remarks: string
}

export const setting = async (key: string) => {
  const record = await prisma.settings.findUnique({ where: { key } })
  return record?.value || process.env[key.toUpperCase()]
}

const createImportedLead = async (input: LeadInput, source: 'META_ADS' | 'GOOGLE_ADS') => {
  const rawMobile = input.mobile?.trim() || ''
  const digits = rawMobile.replace(/\D/g, '')
  const mobile = rawMobile.startsWith('+')
    ? `+${digits}`
    : digits.length === 10
      ? `+91${digits}`
      : ''
  if (!/^\+[1-9]\d{7,14}$/.test(mobile)) {
    throw new Error(`${source === 'META_ADS' ? 'Meta' : 'Google'} Ads lead has no valid phone number with country code`)
  }
  const duplicate = await prisma.lead.findFirst({ where: { mobile, isActive: true } })
  const lead = await prisma.lead.create({
    data: {
      name: input.name.trim() || 'Ad lead',
      mobile,
      email: input.email?.trim() || null,
      city: input.city?.trim() || null,
      source,
      status: 'NEW',
      remarks: input.remarks,
      isDuplicate: !!duplicate,
    },
  })
  await prisma.activity.create({
    data: {
      leadId: lead.id,
      type: 'LEAD_CREATED',
      description: `${source === 'META_ADS' ? 'Meta' : 'Google'} Ads lead imported`,
      metadata: { source, campaignId: input.campaignId, campaignName: input.campaignName },
    },
  })
  return lead
}

const fieldMap = (fields: any[] = []) => fields.reduce((result, field) => {
  const key = String(field.field_name || field.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  result[key] = field.field_value || field.value || ''
  return result
}, {} as Record<string, string>)

export const importMetaLead = async (leadgenId: string) => {
  const accessToken = await setting('meta_lead_access_token')
  if (!accessToken) throw new Error('Meta lead integration is not configured')
  const response = await axios.get(`https://graph.facebook.com/v20.0/${encodeURIComponent(leadgenId)}`, {
    params: { fields: 'field_data,created_time,ad_id,form_id', access_token: accessToken },
    timeout: 15000,
  })
  const fields = fieldMap(response.data?.field_data)
  return createImportedLead({
    name: fields.fullname || fields.name || 'Meta lead',
    mobile: fields.phone || fields.phonenumber || fields.mobile,
    email: fields.email || fields.emailaddress,
    city: fields.city,
    campaignId: response.data?.ad_id,
    remarks: `Meta leadgen ${leadgenId}`,
  }, 'META_ADS')
}

export const getMetaCampaignMetrics = async () => {
  const accessToken = await setting('meta_ads_access_token')
  const accountId = await setting('meta_ad_account_id')
  if (!accessToken || !accountId) throw new Error('Meta Ads reporting is not configured')
  const response = await axios.get(`https://graph.facebook.com/v20.0/act_${accountId.replace(/^act_/, '')}/insights`, {
    params: {
      access_token: accessToken,
      level: 'campaign',
      fields: 'campaign_id,campaign_name,spend,impressions,clicks,actions,cost_per_action_type',
      date_preset: 'last_30d',
    },
    timeout: 20000,
  })
  return (response.data?.data || []).map((campaign: any) => ({ platform: 'META', ...campaign }))
}

export const importGoogleLead = async (payload: any) => {
  const fields = fieldMap(payload.user_column_data || payload.fields || [])
  return createImportedLead({
    name: fields.fullname || fields.name || payload.lead_name || 'Google lead',
    mobile: fields.phone || fields.phonenumber || fields.mobile,
    email: fields.email || fields.emailaddress,
    city: fields.city,
    campaignId: payload.campaign_id,
    campaignName: payload.campaign_name,
    remarks: `Google lead ${payload.lead_id || payload.google_key || 'webhook'}`,
  }, 'GOOGLE_ADS')
}

const googleAccessToken = async () => {
  const clientId = await setting('google_ads_client_id')
  const clientSecret = await setting('google_ads_client_secret')
  const refreshToken = await setting('google_ads_refresh_token')
  if (!clientId || !clientSecret || !refreshToken) throw new Error('Google Ads reporting is not configured')
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token',
  }, { timeout: 15000 })
  return response.data.access_token as string
}

export const getGoogleCampaignMetrics = async () => {
  const customerId = (await setting('google_ads_customer_id'))?.replace(/-/g, '')
  const developerToken = await setting('google_ads_developer_token')
  if (!customerId || !developerToken) throw new Error('Google Ads reporting is not configured')
  const response = await axios.post(`https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:searchStream`, [{
    query: `SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS`,
  }], {
    headers: {
      Authorization: `Bearer ${await googleAccessToken()}`,
      'developer-token': developerToken,
      ...(await setting('google_ads_login_customer_id') ? { 'login-customer-id': (await setting('google_ads_login_customer_id'))?.replace(/-/g, '') } : {}),
    },
    timeout: 20000,
  })
  return (response.data || []).flatMap((batch: any) => batch.results || []).map((row: any) => ({
    platform: 'GOOGLE',
    campaignId: row.campaign?.id,
    campaignName: row.campaign?.name,
    impressions: row.metrics?.impressions || 0,
    clicks: row.metrics?.clicks || 0,
    spend: Number(row.metrics?.costMicros || 0) / 1000000,
    leads: row.metrics?.conversions || 0,
  }))
}