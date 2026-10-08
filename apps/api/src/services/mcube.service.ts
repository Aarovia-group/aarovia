import axios from 'axios'
import prisma from '../utils/prisma'

const getRequiredConfig = async () => {
  const settingKeys = [
    'mcube_api_token', 'mcube_agent_phone_number', 'mcube_click_to_call_url', 'mcube_api_token_field',
    'mcube_api_token_prefix', 'mcube_agent_field', 'mcube_customer_field', 'mcube_did_field', 'mcube_refurl_field', 'mcube_refurl',
  ]
  const settings = await prisma.settings.findMany({ where: { key: { in: settingKeys } } })
  const values = settings.reduce((result: Record<string, string>, item) => {
    result[item.key] = item.value
    return result
  }, {})
  const getValue = (key: string, envName: string, fallback = '') => values[key]?.trim() || process.env[envName] || fallback
  const url = getValue('mcube_click_to_call_url', 'MCUBE_CLICK_TO_CALL_URL', 'https://api.mcube.com/Restmcube-api/outbound-calls')
  const token = getValue('mcube_api_token', 'MCUBE_API_TOKEN')
  const agentNumber = getValue('mcube_agent_phone_number', 'MCUBE_AGENT_PHONE_NUMBER')

  if (!url || !token || !agentNumber) {
    throw new Error('MCUBE calling is not configured')
  }

  return {
    url,
    token,
    agentNumber,
    tokenField: getValue('mcube_api_token_field', 'MCUBE_API_TOKEN_FIELD', 'HTTP_AUTHORIZATION'),
    tokenPrefix: getValue('mcube_api_token_prefix', 'MCUBE_API_TOKEN_PREFIX'),
    agentField: getValue('mcube_agent_field', 'MCUBE_AGENT_FIELD', 'exenumber'),
    customerField: getValue('mcube_customer_field', 'MCUBE_CUSTOMER_FIELD', 'custnumber'),
    didField: getValue('mcube_did_field', 'MCUBE_DID_FIELD', 'did'),
    refurlField: getValue('mcube_refurl_field', 'MCUBE_REFURL_FIELD', 'refurl'),
    refurl: getValue('mcube_refurl', 'MCUBE_REFURL', '1'),
  }
}

export const startMcubeCall = async (customerNumber: string, outgoingDid?: string) => {
  const { url, token, agentNumber, tokenField, tokenPrefix, agentField, customerField, didField, refurlField, refurl } = await getRequiredConfig()
  const payload: Record<string, string> = {
    [tokenField]: `${tokenPrefix}${token}`,
    [agentField]: agentNumber,
    [customerField]: customerNumber,
    [refurlField]: refurl,
  }
  if (outgoingDid) payload[didField] = outgoingDid

  const response = await axios.post(
    url,
    payload,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    },
  )

  return { status: response.status, data: response.data }
}

export const releaseMcubeCall = async (callId: string) => {
  const settings = await prisma.settings.findUnique({
    where: { key: 'mcube_call_release_token' },
    select: { value: true },
  })
  const token = settings?.value?.trim() || process.env.MCUBE_CALL_RELEASE_TOKEN?.trim()
  if (!token) {
    throw new Error('MCUBE call-release Business Token is not configured')
  }

  const response = await axios.post(
    'https://config.mcube.com/hangup-api/call-release',
    { token, callid: callId },
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    },
  )

  if (response.data?.status === false || response.data?.success === false) {
    throw new Error(response.data?.message || response.data?.msg || 'MCUBE rejected the call-release request')
  }

  return { status: response.status }
}