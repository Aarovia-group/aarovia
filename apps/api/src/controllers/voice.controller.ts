import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { startMcubeCall } from '../services/mcube.service'
import { findOutgoingDidForAgent, getOutgoingDidsForAgent, normalizeRoutingPhone, parseIncomingCallRoutes, parseOutgoingDidRoutes } from '../services/incoming-call-routing'
import prisma from '../utils/prisma'

const normalizeVoiceNumber = (value: string) => {
  const withoutScheme = value.trim().replace(/^whatsapp:/i, '')
  const digits = withoutScheme.replace(/\D/g, '')
  const countryCode = (process.env.TWILIO_DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '')
  const e164 = withoutScheme.startsWith('+') ? digits : digits.length === 10 ? `${countryCode}${digits}` : digits
  return e164 ? `+${e164}` : ''
}

const digitsOnly = (value: unknown) => String(value || '').replace(/\D/g, '').slice(-10)
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

const getNextOutgoingDid = async (routes: ReturnType<typeof parseOutgoingDidRoutes>, agentName?: string, role?: string) => {
  const dids = getOutgoingDidsForAgent(routes, agentName, role)
  if (!dids?.length) return undefined
  if (dids.length === 1) return dids[0]

  const agentKey = role === 'ADMIN' || role === 'SUPER_ADMIN'
    ? role
    : String(agentName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!agentKey) return undefined

  return prisma.$transaction(async transaction => {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(8071439584)`
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
    const did = findOutgoingDidForAgent(routes, agentName, role, callIndex)
    if (!did) throw new Error(`No MCUBE outgoing DID configured for ${agentKey}`)
    await transaction.settings.upsert({
      where: { key: 'mcube_outgoing_did_rotation' },
      update: { value: JSON.stringify(counters), group: 'voice' },
      create: { key: 'mcube_outgoing_did_rotation', value: JSON.stringify(counters), group: 'voice' },
    })
    return did
  }, { maxWait: 10000, timeout: 10000 })
}

export const receiveMcubeCallback = async (req: Request, res: Response) => {
  try {
    const payload = req.body || {}
    const recordingUrl = getRecordingUrl(payload)
    const direction = String(payload.direction || payload.call_type || payload.calltype || 'unknown')
    const isIncoming = /inbound|incoming|^in$/i.test(direction.trim())
    const customerNumbers = (isIncoming
      ? [payload.callfrom, payload.call_from, payload.caller_number, payload.callerNumber, payload.callerid, payload.from, payload.custnumber, payload.customer_number, payload.customerNumber, payload.phone, payload.mobile, payload.callto, payload.clicktocalldid]
      : [payload.callto, payload.clicktocalldid, payload.custnumber, payload.customer_number, payload.customerNumber]
    ).map(digitsOnly).filter((number: string) => number.length === 10)
    const customerNumber = customerNumbers[0]
    const callId = String(payload.callid || payload.call_id || payload.id || '').trim()
    const [users, routesSetting] = await Promise.all([
      prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, phone: true, role: true } }),
      prisma.settings.findUnique({ where: { key: 'mcube_incoming_routes' }, select: { value: true } }),
    ])
    const incomingRoutes = parseIncomingCallRoutes(routesSetting?.value)
    const incomingNumbers = isIncoming ? getIncomingLineNumbers(payload) : []
    const incomingRoute = incomingRoutes.find(route => incomingNumbers.includes(route.incomingNumber))
    const agentPhone = digitsOnly(payload.emp_phone)
    const mappedAgent = incomingRoute
      ? users.find(user => digitsOnly(user.phone) === incomingRoute.agentPhone)
        || users.find(user => user.name.trim().toLowerCase() === incomingRoute.agentName.toLowerCase())
      : undefined
    const agent = isIncoming && incomingRoute
      ? mappedAgent
      : users.find((user) => digitsOnly(user.phone) === agentPhone)
        || users.find((user) => ['ADMIN', 'SUPER_ADMIN'].includes(user.role))
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
    console.info('[Voice] MCUBE callback received', {
      callId,
      direction,
      leadId: lead?.id,
      assignedAgentId: agent?.id,
      incomingNumber: incomingRoute?.incomingNumber,
    })
    return res.sendStatus(200)
  } catch (error: any) {
    console.error('[Voice] MCUBE callback failed', error.message)
    return res.sendStatus(500)
  }
}

export const getVoiceToken = (req: AuthRequest, res: Response) => {
  return res.json({ success: true, data: { provider: 'MCUBE' } })
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
          prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } }),
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
    const outgoingDid = await getNextOutgoingDid(outgoingRoutes, req.user?.name, req.user?.role)

    const result = await startMcubeCall(customerNumber, outgoingDid)
    console.info('[Voice] MCUBE outbound call response', { status: result.status, agentName: req.user?.name, outgoingDid })
    if (result.data?.status === false) {
      return res.status(502).json({ success: false, message: result.data.msg || 'MCUBE rejected the call request' })
    }
    if (leadId && req.user?.id) {
      const callId = String(result.data?.callid || result.data?.call_id || result.data?.id || '').trim()
      await prisma.callLog.create({
        data: {
          leadId,
          userId: req.user.id,
          outcome: 'INITIATED',
          notes: callId ? `MCUBE_CALL_ID=${callId} | MCUBE outbound call` : `MCUBE outbound call to ${customerNumber}`,
        },
      })
    }
    return res.json({ success: true, data: { provider: 'MCUBE', result } })
  } catch (error: any) {
    const status = error.message === 'MCUBE calling is not configured' ? 503 : 502
    console.error('[Voice] MCUBE call failed', error.response?.data || error.message)
    return res.status(status).json({ success: false, message: error.message === 'MCUBE calling is not configured' ? error.message : 'Unable to start call' })
  }
}
