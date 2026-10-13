import { timingSafeEqual } from 'crypto'
import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { releaseMcubeCall, startMcubeCall } from '../services/mcube.service'
import { DEFAULT_MCUBE_EXECUTIVE_NUMBERS, findIncomingCallRoute, findIncomingCallerNumber, findOutgoingDidForAgent, getMcubeExecutiveNumber, getOutgoingDidsForAgent, normalizeRoutingPhone, parseIncomingCallRoutes, parseOutgoingDidRoutes } from '../services/incoming-call-routing'
import { chooseIncomingCallAgent, findMappedIncomingDid, getIncomingFollowupDate, hasIncomingCallIdBeenProcessed, getIncomingCallId, getIncomingCaller, getIncomingDid, isInternalOrTestCall, isMissedIncomingCall, normalizeIncomingPhone, planIncomingLead } from '../services/incoming-mcube-call'
import prisma from '../utils/prisma'

const normalizeVoiceNumber = (value: string) => {
  const withoutScheme = value.trim().replace(/^whatsapp:/i, '')
  const digits = withoutScheme.replace(/\D/g, '')
  const countryCode = (process.env.TWILIO_DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '')
  const e164 = withoutScheme.startsWith('+') ? digits : digits.length === 10 ? `${countryCode}${digits}` : digits
  return e164 ? `+${e164}` : ''
}

const digitsOnly = (value: unknown) => String(value || '').replace(/\D/g, '').slice(-10)
const normalizeAgentName = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const getIncomingLineNumbers = (payload: Record<string, any>) => [
  payload.clicktocalldid,
  payload.click_to_call_did,
  payload.called_number,
  payload.calledNumber,
  payload.destination_number,
  payload.virtual_number,
  payload.did,
  payload.callto,
  payload.call_to,
].map(normalizeRoutingPhone).filter(Boolean)
const parseMcubeDate = (value: unknown) => {
  const date = new Date(String(value || '').replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? new Date() : date
}
const parseDuration = (value: unknown) => {
  const match = String(value || '').match(/^(\d+):(\d+):(\d+)$/)
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : Number(value) || 0
}
const getRecordingUrl = (payload: Record<string, any>) => {
  const candidates = [payload.filename, payload.recordingUrl, payload.recording_url, payload.recording, payload.recordinglink, payload.recording_link]
  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || null
}

const getNextOutgoingDid = async (
  routes: ReturnType<typeof parseOutgoingDidRoutes>,
  agentName?: string,
  role?: string,
  projectName?: string,
) => {
  const dids = getOutgoingDidsForAgent(routes, agentName, role, projectName)
  if (!dids?.length) return undefined
  if (dids.length === 1) return dids[0]

  const agentKey = role === 'ADMIN' || role === 'SUPER_ADMIN'
    ? role
    : String(agentName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!agentKey) return undefined

  return prisma.$transaction(async transaction => {
    await transaction.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(8071439584)) AS advisory_lock`
    const counterSetting = await transaction.settings.findUnique({
      where: { key: 'mcube_outgoing_did_rotation' },
      select: { value: true },
    })
    let counters: Record<string, number> = {}
    if (counterSetting?.value) {
      const parsed: unknown = JSON.parse(counterSetting.value)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid MCUBE outgoing DID rotation counters')
      }
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
          throw new Error(`Invalid MCUBE outgoing DID rotation counter for ${key}`)
        }
        counters[key] = value
      }
    }
    const callIndex = counters[agentKey] ?? 0
    if (!Number.isSafeInteger(callIndex) || callIndex < 0) {
      throw new Error(`Invalid MCUBE outgoing DID rotation counter for ${agentKey}`)
    }
    counters[agentKey] = callIndex + 1
    const did = findOutgoingDidForAgent(routes, agentName, role, callIndex, projectName)
    if (!did) throw new Error(`No MCUBE outgoing DID configured for ${agentKey}`)
    await transaction.settings.upsert({
      where: { key: 'mcube_outgoing_did_rotation' },
      update: { value: JSON.stringify(counters), group: 'voice' },
      create: { key: 'mcube_outgoing_did_rotation', value: JSON.stringify(counters), group: 'voice' },
    })
    return did
  }, { maxWait: 10000, timeout: 10000 })
}

const maskSensitiveData = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(maskSensitiveData)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      /token|secret|password|authorization|cookie|api[-_]?key/i.test(key) ? '[REDACTED]' : maskSensitiveData(entry),
    ]))
  }
  return value
}

const isWebhookTokenValid = (expected: string, provided: string) => {
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer)
}

const getWebhookToken = (req: Request) => {
  const header = req.get('x-mcube-webhook-token') || req.get('x-webhook-token') || ''
  const authorization = req.get('authorization') || ''
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || ''
  return String(req.query.token || header || bearerToken)
}

const asPayloadRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const getIncomingCallbackPayload = (req: Request): Record<string, any> => ({
  ...asPayloadRecord(req.query),
  ...asPayloadRecord(req.body),
})

const getCallbackRawPayload = (req: Request) => maskSensitiveData({
  body: req.body || {},
  query: req.query || {},
})

const getMaskedCallbackHeaders = (req: Request) => Object.fromEntries(
  Object.entries(req.headers).map(([name, value]) => [
    name,
    /token|secret|password|authorization|cookie|api[-_]?key|referer/i.test(name) ? '[REDACTED]' : value,
  ]),
)

const logCallbackRequest = (req: Request) => console.info('[Voice] MCUBE callback received', {
  body: maskSensitiveData(req.body || {}),
  query: maskSensitiveData(req.query || {}),
  headers: getMaskedCallbackHeaders(req),
})

const hasValidWebhookToken = (req: Request) => {
  const expectedToken = process.env.MCUBE_WEBHOOK_TOKEN?.trim()
  return !expectedToken || isWebhookTokenValid(expectedToken, getWebhookToken(req))
}

const isPopupCallback = (payload: Record<string, unknown>) =>
  [payload.event, payload.event_type, payload.type, payload.action]
    .some(value => typeof value === 'string' && /\bpopup\b/i.test(value))

const callbackDate = (payload: Record<string, unknown>, fields: string[]) => {
  for (const field of fields) {
    if (!payload[field]) continue
    const date = new Date(String(payload[field]).replace(' ', 'T'))
    if (!Number.isNaN(date.getTime())) return date
  }
  return undefined
}

const processIncomingCallback = async (
  payload: Record<string, unknown>,
  rawPayload: unknown,
) => {
  const directionValue = payload.direction || payload.call_type || payload.calltype || payload.callDirection || payload.call_direction
  const direction = String(directionValue || 'unknown')
  const explicitlyOutbound = /\b(outbound|outgoing)\b|^out$/i.test(direction.trim())
  if (explicitlyOutbound) return false

  const incomingDids = getIncomingLineNumbers(payload as Record<string, any>)
  const did = getIncomingDid(payload)
  const [mappingResults, users, routesSetting] = await Promise.all([
    incomingDids.length
      ? prisma.incomingCallDid.findMany({
          where: { did: { in: incomingDids }, isActive: true },
          include: {
            assignedAgents: {
              where: { user: { isActive: true } },
              orderBy: { position: 'asc' },
              include: { user: { select: { id: true, name: true, phone: true } } },
            },
          },
        })
      : null,
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, phone: true } }),
    prisma.settings.findUnique({ where: { key: 'mcube_incoming_routes' }, select: { value: true } }),
  ])
  const mapping = findMappedIncomingDid(mappingResults || [], incomingDids)
  let incomingRoutes: ReturnType<typeof parseIncomingCallRoutes>
  try {
    incomingRoutes = parseIncomingCallRoutes(routesSetting?.value)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid MCUBE incoming route settings'
    console.error('[Voice] unable to read legacy incoming routes; using default DID exclusions', message)
    incomingRoutes = parseIncomingCallRoutes()
  }
  const legacyRoute = findIncomingCallRoute(incomingRoutes, incomingDids)
  const hasIncomingDidField = [
    'clicktocalldid', 'click_to_call_did', 'called_number', 'calledNumber',
    'destination_number', 'virtual_number', 'did',
  ].some(field => Boolean(payload[field]))
  const incoming = (
    /inbound|incoming|^in$/i.test(direction.trim())
    || Boolean(mapping)
    || Boolean(legacyRoute)
    || hasIncomingDidField
  )
  if (!incoming) return false

  const callerCandidate = getIncomingCaller(payload, [])
  const knownDidNumbers = [...incomingRoutes.map(route => route.incomingNumber), ...(mapping ? [mapping.did] : [])]
  if (callerCandidate && knownDidNumbers.some(knownDid => normalizeRoutingPhone(knownDid) === normalizeRoutingPhone(callerCandidate))) {
    console.info('[Voice] skipped: caller-matches-incoming-did', { callId: getIncomingCallId(payload), did: callerCandidate })
    return true
  }
  const callerNumber = getIncomingCaller(payload, knownDidNumbers)
  const callId = getIncomingCallId(payload)
  const logDid = mapping?.did || legacyRoute?.incomingNumber || (hasIncomingDidField ? did : '') || ''
  const callbackType = [direction, payload.event, payload.event_type, payload.type]
    .filter(value => typeof value === 'string')
    .join(' ')
  if (isInternalOrTestCall(callbackType, callerNumber || '', logDid)) {
    console.info('[Voice] skipped: internal-or-test-call', { callId, did: logDid, direction })
    return true
  }
  if (!callerNumber) {
    console.info('[Voice] skipped: no-caller-number', { callId, did: logDid, direction })
    return true
  }

  const agentPhone = digitsOnly(payload.emp_phone || payload.empPhone || payload.agent_phone || payload.agentPhone)
  const callbackAgentName = normalizeAgentName(payload.agentname || payload.agent_name || payload.agentName)
  const callbackNameMatches = callbackAgentName
    ? users.filter(user => normalizeAgentName(user.name).startsWith(callbackAgentName))
    : []
  const answeringAgent = (agentPhone ? users.find(user => digitsOnly(user.phone) === agentPhone) : undefined)
    || users.find(user => normalizeAgentName(user.name) === callbackAgentName)
    || (callbackNameMatches.length === 1 ? callbackNameMatches[0] : undefined)
  const assignedAgents = mapping?.assignedAgents.map(assignment => assignment.user) || []
  const callStatus = String(payload.dialstatus || payload.dial_status || payload.call_status || payload.status || 'UNKNOWN')
  const durationValue = payload.answeredtime ?? payload.duration ?? payload.call_duration
  const duration = parseDuration(durationValue)
  const startTime = callbackDate(payload, ['starttime', 'start_time', 'startTime']) || parseMcubeDate(undefined)
  const endTime = callbackDate(payload, ['endtime', 'end_time', 'endTime'])
  const recordingUrl = getRecordingUrl(payload as Record<string, any>)
  const callerName = String(payload.caller_name || payload.callerName || payload.name || '').trim()
  const normalizedMobile = normalizeIncomingPhone(callerNumber)
  try {
    const result = await prisma.$transaction(async transaction => {
      if (callId) {
        const existingCall = await transaction.callLog.findUnique({
          where: { callId },
          select: { id: true, callId: true, leadId: true, outcome: true, duration: true, recordingUrl: true, endTime: true },
        })
        if (existingCall && hasIncomingCallIdBeenProcessed(callId, existingCall.callId)) {
          await transaction.callLog.update({
            where: { id: existingCall.id },
            data: {
              outcome: callStatus === 'UNKNOWN' ? existingCall.outcome : callStatus,
              duration: duration || existingCall.duration,
              recordingUrl: recordingUrl || existingCall.recordingUrl,
              endTime: endTime || existingCall.endTime,
              rawPayload: rawPayload as object,
            },
          })
          return { leadId: existingCall.leadId, duplicate: true, assignedAgentId: null as string | null }
        }
      }

      let roundRobinIndex = mapping?.roundRobinCursor || 0
      const hasAnsweringAgentInGroup = Boolean(answeringAgent && assignedAgents.some(agent => agent.id === answeringAgent.id))
      if (mapping && assignedAgents.length && !hasAnsweringAgentInGroup) {
        const advancedMapping = await transaction.incomingCallDid.update({
          where: { id: mapping.id },
          data: { roundRobinCursor: { increment: 1 } },
          select: { roundRobinCursor: true },
        })
        roundRobinIndex = advancedMapping.roundRobinCursor - 1
      }
      const agent = chooseIncomingCallAgent(assignedAgents, answeringAgent, roundRobinIndex, Boolean(mapping))
      const projectId = mapping?.projectId || null
      const leadIdentityLock = `${normalizeRoutingPhone(callerNumber)}:${projectId || ''}:${agent?.id || ''}`
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${leadIdentityLock}, 0))`
      const inboundActivityDetails = {
        provider: 'MCUBE',
        callId: callId || null,
        direction: 'INCOMING',
        status: callStatus,
        duration,
        did: logDid || null,
        channel: mapping?.channel || null,
        agentId: agent?.id || null,
        agentName: agent?.name || null,
        recordingUrl,
      }
      const matchingLeads = await transaction.lead.findMany({
        where: { isActive: true, mobile: { endsWith: callerNumber }, projectId, assignedToId: agent?.id || null },
        select: { id: true, name: true, mobile: true, projectId: true, assignedToId: true },
      })
      const leadPlan = planIncomingLead(matchingLeads, callerNumber, projectId, agent?.id || null)
      let lead = leadPlan.action === 'reuse' ? leadPlan.lead : undefined
      const missed = isMissedIncomingCall(callStatus)
      const followupToday = getIncomingFollowupDate(callStatus)

      if (!lead) {
        lead = await transaction.lead.create({
          data: {
            name: callerName || 'Unknown',
            mobile: normalizedMobile,
            source: 'DIRECT_CALL',
            status: 'NEW',
            tags: [],
            remarks: 'Lead created from an incoming MCUBE call',
            nextFollowupDate: missed ? followupToday : null,
            projectId,
            assignedToId: agent?.id,
            createdById: agent?.id,
          },
          select: { id: true, name: true, mobile: true, projectId: true, assignedToId: true },
        })
        await transaction.activity.create({
          data: {
            leadId: lead.id,
            userId: agent?.id,
            type: 'LEAD_CREATED',
            description: 'Lead created from an incoming MCUBE call',
            metadata: inboundActivityDetails,
          },
        })
      } else if (missed) {
        await transaction.lead.update({
          where: { id: lead.id },
          data: { nextFollowupDate: followupToday },
        })
      }

      await transaction.callLog.create({
        data: {
          callId: callId || null,
          caller: normalizedMobile,
          did: logDid || null,
          direction: 'INCOMING',
          calledAt: startTime,
          endTime,
          duration,
          outcome: callStatus,
          recordingUrl,
          notes: `MCUBE incoming call from ${normalizedMobile}${logDid ? ` to ${logDid}` : ''}`,
          rawPayload: rawPayload as object,
          leadId: lead.id,
          userId: agent?.id,
        },
      })
      await transaction.activity.create({
        data: {
          leadId: lead.id,
          userId: agent?.id,
          type: 'CALL_LOGGED',
          description: `MCUBE incoming call - ${callStatus}${duration ? ` (${duration}s)` : ''}`,
          metadata: inboundActivityDetails,
        },
      })
      return { leadId: lead.id, duplicate: false, assignedAgentId: agent?.id || null }
    }, { maxWait: 10000, timeout: 15000 })

    if (mapping && !assignedAgents.length) {
      console.warn('[Voice] unmapped DID agent group is empty', { did: mapping.did, callId })
    }
    if (!mapping || !mapping.projectId) {
      console.warn('[Voice] unmapped DID or project; creating lead without a project', { did: logDid, callId })
    }
    if (result.duplicate) {
      console.info('[Voice] skipped: duplicate-call-id', { callId, leadId: result.leadId })
    } else {
      console.info('[Voice] inbound call saved', {
        callId,
        leadId: result.leadId,
        did: logDid,
        projectId: mapping?.projectId || null,
        assignedAgentId: result.assignedAgentId,
      })
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002' && callId) {
      console.info('[Voice] skipped: duplicate-call-id', { callId })
      return true
    }
    throw error
  }

  return true
}

export const receiveMcubeCallback = async (req: Request, res: Response) => {
  try {
    const rawPayload = getCallbackRawPayload(req)
    const payload = getIncomingCallbackPayload(req)
    logCallbackRequest(req)

    if (!hasValidWebhookToken(req)) {
      console.warn('[Voice] skipped: invalid webhook token')
      return res.sendStatus(401)
    }
    if (isPopupCallback(payload)) {
      console.info('[Voice] skipped: popup callback', { event: payload.event || payload.event_type || payload.type || payload.action })
      return res.sendStatus(200)
    }

    if (await processIncomingCallback(payload, rawPayload)) return res.sendStatus(200)

    const recordingUrl = getRecordingUrl(payload)
    const direction = String(payload.direction || payload.call_type || payload.calltype || payload.callDirection || payload.call_direction || 'unknown')
    const callId = String(payload.callid || payload.call_id || payload.id || '').trim()
    const [users, routesSetting] = await Promise.all([
      prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, phone: true, role: true } }),
      prisma.settings.findUnique({ where: { key: 'mcube_incoming_routes' }, select: { value: true } }),
    ])
    const incomingRoutes = parseIncomingCallRoutes(routesSetting?.value)
    const incomingRoute = findIncomingCallRoute(incomingRoutes, getIncomingLineNumbers(payload))
    const isIncoming = /inbound|incoming|^in$/i.test(direction.trim()) || Boolean(incomingRoute)
    const agentPhone = digitsOnly(payload.emp_phone)
    const callbackAgentName = normalizeAgentName(payload.agentname)
    const callbackNameMatches = callbackAgentName
      ? users.filter(user => normalizeAgentName(user.name).startsWith(callbackAgentName))
      : []
    const callbackAgent = (agentPhone ? users.find(user => digitsOnly(user.phone) === agentPhone) : undefined)
      || users.find(user => normalizeAgentName(user.name) === callbackAgentName)
      || (callbackNameMatches.length === 1 ? callbackNameMatches[0] : undefined)
    const mappedAgent = incomingRoute
      ? users.find(user => digitsOnly(user.phone) === incomingRoute.agentPhone)
        || users.find(user => user.name.trim().toLowerCase() === incomingRoute.agentName.toLowerCase())
      : undefined
    const fallbackAgent = users.find(user => ['ADMIN', 'SUPER_ADMIN'].includes(user.role))
    const agent = isIncoming
      ? callbackAgent || mappedAgent || fallbackAgent
      : callbackAgent || fallbackAgent
    const customerNumber = isIncoming
      ? findIncomingCallerNumber(payload, [
          ...incomingRoutes.map(route => route.incomingNumber),
          ...incomingRoutes.map(route => route.agentPhone),
          ...Object.values(DEFAULT_MCUBE_EXECUTIVE_NUMBERS),
          agentPhone,
        ])
      : [payload.callto, payload.custnumber, payload.customer_number, payload.customerNumber]
        .map(digitsOnly)
        .find(number => number.length === 10)
    const existingCall = callId
      ? await prisma.callLog.findFirst({ where: { notes: { contains: callId } }, include: { lead: true } })
      : null
    let lead = existingCall?.lead || (customerNumber
      ? await prisma.lead.findFirst({ where: { isActive: true, mobile: { endsWith: customerNumber } } })
      : null)

    if (!lead && isIncoming && customerNumber) {
      const callerName = String(payload.caller_name || payload.callerName || payload.name || '').trim()
      lead = await prisma.lead.create({
        data: {
          name: callerName || `Incoming caller ${customerNumber}`,
          mobile: normalizeVoiceNumber(customerNumber),
          source: 'DIRECT_CALL',
          status: 'NEW',
          tags: [],
          remarks: 'Lead created from an incoming MCUBE call',
          assignedToId: agent?.id,
          createdById: agent?.id,
        },
      })
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: agent?.id,
          type: 'LEAD_CREATED',
          description: 'Lead created from an incoming MCUBE call',
          metadata: { provider: 'MCUBE', callId, direction },
        },
      })
    }

    if (lead && isIncoming && incomingRoute && agent && lead.assignedToId !== agent.id) {
      await prisma.lead.update({ where: { id: lead.id }, data: { assignedToId: agent.id } })
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: agent.id,
          type: 'LEAD_ASSIGNED',
          description: `Incoming call routed from ${incomingRoute.incomingNumber} to ${agent.name}`,
          metadata: { provider: 'MCUBE', incomingNumber: incomingRoute.incomingNumber, assignedToId: agent.id },
        },
      })
    }

    if (lead && agent) {
      const calledAt = parseMcubeDate(payload.starttime)
      const duration = parseDuration(payload.answeredtime)
      const outcome = String(payload.dialstatus || 'UNKNOWN')
      const notesBase = callId ? `MCUBE_CALL_ID=${callId} | ` : ''
      const notes = `${notesBase}MCUBE ${direction} call`.trim()
      const matchingCall = existingCall && existingCall.leadId === lead.id ? existingCall : callId
        ? await prisma.callLog.findFirst({ where: { leadId: lead.id, notes: { contains: callId } } })
        : await prisma.callLog.findFirst({
            where: {
              leadId: lead.id,
              outcome: 'INITIATED',
              calledAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            orderBy: { calledAt: 'desc' },
          })
      if (matchingCall) {
        const agentDetails = matchingCall.notes?.split(' | Agent details: ')[1]
        await prisma.callLog.update({
          where: { id: matchingCall.id },
          data: {
            calledAt,
            duration,
            outcome: agentDetails ? matchingCall.outcome : outcome,
            recordingUrl: recordingUrl || matchingCall.recordingUrl,
            notes: agentDetails ? `${notes} | Agent details: ${agentDetails}` : notes,
          },
        })
      } else {
        await prisma.callLog.create({ data: { leadId: lead.id, userId: agent.id, calledAt, duration, outcome, recordingUrl, notes } })
      }
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: agent.id,
          type: 'CALL_LOGGED',
          description: `MCUBE ${direction} call - ${outcome}`,
          metadata: { provider: 'MCUBE', callId, direction, disconnectedBy: payload.disconnectedby, groupName: payload.groupname, agentName: payload.agentname },
        },
      })
    }

    if (isIncoming && incomingRoute && !agent) {
      console.error('[Voice] Incoming MCUBE route has no matching active CRM agent', {
        incomingNumber: incomingRoute.incomingNumber,
        agentName: incomingRoute.agentName,
      })
    }
    if (isIncoming && !customerNumber) {
      const nestedPayloadFields = ['call', 'data', 'details', 'call_data', 'call_details', 'callData']
        .flatMap(key => {
          const value = payload[key]
          return value && typeof value === 'object' && !Array.isArray(value)
            ? Object.keys(value).map(field => `${key}.${field}`)
            : []
        })
      console.error('[Voice] Incoming MCUBE callback has no caller number; lead was not created', {
        callId,
        incomingNumber: incomingRoute?.incomingNumber,
        payloadFields: [...Object.keys(payload), ...nestedPayloadFields],
      })
    }
    console.info('[Voice] MCUBE callback received', {
      callId,
      direction,
      leadId: lead?.id,
      assignedAgentId: agent?.id,
      incomingNumber: incomingRoute?.incomingNumber,
    })
    if (!lead) console.info('[Voice] skipped: no-matching-lead', { callId, direction, customerNumber })
    else if (!agent) console.info('[Voice] skipped: no-active-agent', { callId, direction, leadId: lead.id })
    return res.sendStatus(200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown callback processing error'
    console.error('[Voice] skipped: callback-processing-error', message)
    return res.sendStatus(200)
  }
}

export const receiveMcubePopup = (req: Request, res: Response) => {
  try {
    logCallbackRequest(req)
    if (!hasValidWebhookToken(req)) {
      console.warn('[Voice] skipped: invalid webhook token')
      return res.sendStatus(401)
    }
    console.info('[Voice] skipped: popup callback')
    return res.sendStatus(200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown callback processing error'
    console.error('[Voice] skipped: popup-processing-error', message)
    return res.sendStatus(200)
  }
}

export const getVoiceToken = (req: AuthRequest, res: Response) => {
  return res.json({ success: true, data: { provider: 'MCUBE' } })
}

const findMcubeCallId = (value: unknown): string => {
  if (!value || typeof value !== 'object') return ''
  if (Array.isArray(value)) {
    for (const item of value) {
      const callId = findMcubeCallId(item)
      if (callId) return callId
    }
    return ''
  }

  const record = value as Record<string, unknown>
  for (const key of ['callid', 'call_id', 'liveCallid', 'live_callid', 'id']) {
    const callId = record[key]
    if (typeof callId === 'string' || typeof callId === 'number') {
      const normalized = String(callId).trim()
      if (normalized) return normalized
    }
  }
  for (const key of ['data', 'result', 'response']) {
    const callId = findMcubeCallId(record[key])
    if (callId) return callId
  }
  return ''
}

export const releaseVoiceCall = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
  const leadId = typeof req.body?.leadId === 'string' ? req.body.leadId : ''
  const callLogId = typeof req.body?.callLogId === 'string' ? req.body.callLogId : ''
  if (!leadId || !callLogId) {
    return res.status(400).json({ success: false, message: 'Lead and call log are required' })
  }

  try {
    const callLog = await prisma.callLog.findFirst({
      where: {
        id: callLogId,
        leadId,
        ...(req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' ? {} : { userId: req.user.id }),
      },
      select: { id: true, notes: true },
    })
    if (!callLog) return res.status(404).json({ success: false, message: 'Call log not found for this lead' })

    const callId = callLog.notes?.match(/(?:^|\|)\s*MCUBE_CALL_ID=([^|\s]+)/)?.[1]
    if (!callId) {
      return res.status(409).json({ success: false, message: 'MCUBE did not return a live call ID for this call; it cannot be disconnected from the CRM' })
    }
    if (!/^[A-Za-z0-9_-]+$/.test(callId)) {
      return res.status(409).json({ success: false, message: 'The MCUBE call ID is invalid; it cannot be sent to the call-release API' })
    }

    const result = await releaseMcubeCall(callId)
    return res.json({
      success: true,
      message: 'Call release request sent to MCUBE',
      data: { callLogId: callLog.id, status: result.status },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to release MCUBE call'
    const statusCode = message === 'MCUBE call-release Business Token is not configured' ? 503 : 502
    console.error('[Voice] MCUBE call release failed', message)
    return res.status(statusCode).json({ success: false, message })
  }
}

export const startVoiceCall = async (req: AuthRequest, res: Response) => {
  const normalizedNumber = normalizeVoiceNumber(String(req.body?.to || req.body?.To || ''))
  const customerNumber = normalizedNumber.startsWith('+91') ? normalizedNumber.slice(3) : normalizedNumber.replace(/\D/g, '')
  if (!/^\d{10}$/.test(customerNumber)) {
    return res.status(400).json({ success: false, message: 'A valid customer phone number is required' })
  }

  try {
    const leadId = typeof req.body?.leadId === 'string' ? req.body.leadId : ''
    const [lead, outgoingDidSetting] = leadId
      ? await Promise.all([
          prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, project: { select: { name: true } } } }),
          prisma.settings.findUnique({ where: { key: 'mcube_outgoing_dids' }, select: { value: true } }),
        ])
      : [null, await prisma.settings.findUnique({ where: { key: 'mcube_outgoing_dids' }, select: { value: true } })]
    if (leadId && !lead) return res.status(404).json({ success: false, message: 'Lead not found' })
    const outgoingRoutes = parseOutgoingDidRoutes(outgoingDidSetting?.value)
    const canonicalRoutes = JSON.stringify(outgoingRoutes)
    if (!outgoingDidSetting || outgoingDidSetting.value !== canonicalRoutes) {
      await prisma.settings.upsert({
        where: { key: 'mcube_outgoing_dids' },
        update: { value: canonicalRoutes, group: 'voice' },
        create: { key: 'mcube_outgoing_dids', value: canonicalRoutes, group: 'voice' },
      })
      console.info('[Voice] Repaired persisted MCUBE outgoing DID routes to canonical CRM-user mappings')
    }
    const outgoingDid = await getNextOutgoingDid(outgoingRoutes, req.user?.name, req.user?.role, lead?.project?.name)

    const executiveNumber = getMcubeExecutiveNumber(req.user?.name)
    const result = await startMcubeCall(customerNumber, outgoingDid, executiveNumber)
    console.info('[Voice] MCUBE outbound call response', { status: result.status, agentName: req.user?.name, outgoingDid })
    if (result.data?.status === false) {
      console.warn('[Voice] MCUBE rejected outbound call', { agentName: req.user?.name, message: result.data.msg })
      return res.status(502).json({ success: false, message: result.data.msg || 'MCUBE rejected the call request' })
    }
    const callId = findMcubeCallId(result.data)
    let callLogId: string | undefined
    if (leadId && req.user?.id) {
      const callLog = await prisma.callLog.create({
        data: {
          leadId,
          userId: req.user.id,
          outcome: 'INITIATED',
          notes: callId ? `MCUBE_CALL_ID=${callId} | MCUBE outbound call` : `MCUBE outbound call to ${customerNumber}`,
        },
      })
      callLogId = callLog.id
    }
    return res.json({ success: true, data: { provider: 'MCUBE', result, callId: callId || null, callLogId: callLogId || null } })
  } catch (error: any) {
    const status = error.message === 'MCUBE calling is not configured' ? 503 : 502
    console.error('[Voice] MCUBE call failed', error.response?.data || error.message)
    return res.status(status).json({ success: false, message: error.message === 'MCUBE calling is not configured' ? error.message : 'Unable to start call' })
  }
}
