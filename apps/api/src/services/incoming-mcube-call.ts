import { findIncomingCallerNumber, normalizeRoutingPhone } from './incoming-call-routing'

export interface IncomingCallAgent {
  id: string
  name: string
  phone?: string | null
}

export interface IncomingLeadIdentity {
  mobile: string
  projectId: string | null
  assignedToId: string | null
}

export interface IncomingDidIdentity {
  did: string
  isActive: boolean
}

export type IncomingLeadPlan<T> =
  | { action: 'reuse'; lead: T }
  | { action: 'create' }

export const normalizeIncomingPhone = (value: unknown) => {
  const digits = normalizeRoutingPhone(value)
  return digits ? `+91${digits}` : ''
}

export const getIncomingDid = (payload: Record<string, unknown>) => {
  const fields = [
    'clicktocalldid',
    'click_to_call_did',
    'called_number',
    'calledNumber',
    'destination_number',
    'virtual_number',
    'did',
  ]
  for (const field of fields) {
    const did = normalizeRoutingPhone(payload[field])
    if (did) return did
  }
  return ''
}

export const getIncomingCaller = (payload: Record<string, unknown>, incomingDids: unknown[]) =>
  findIncomingCallerNumber(payload, incomingDids)

export const findMappedIncomingDid = <T extends IncomingDidIdentity>(mappings: T[], incomingDids: string[]) => {
  const activeMappings = new Map(mappings.filter(mapping => mapping.isActive).map(mapping => [
    normalizeRoutingPhone(mapping.did),
    mapping,
  ]))
  return incomingDids.map(normalizeRoutingPhone).map(candidate => activeMappings.get(candidate)).find(Boolean)
}

export const isInternalOrTestCall = (direction: string, caller: string, did: string) =>
  /(?:^|[^a-z0-9])(?:internal|test)(?:$|[^a-z0-9])/i.test(direction)
  || Boolean(caller && did && normalizeRoutingPhone(caller) === normalizeRoutingPhone(did))

export const isMissedIncomingCall = (status: string) => {
  const normalized = status.toLowerCase().replace(/[^a-z0-9]/g, '')
  return ['missed', 'noanswer', 'unanswered', 'notanswered', 'busy', 'failed', 'rejected', 'cancelled', 'canceled']
    .some(indicator => normalized.includes(indicator))
}

export const getIncomingFollowupDate = (status: string, now = new Date()) => {
  if (!isMissedIncomingCall(status)) return null
  const indiaTime = new Date(now.getTime() + 330 * 60 * 1000)
  indiaTime.setUTCHours(0, 0, 0, 0)
  return new Date(indiaTime.getTime() - 330 * 60 * 1000)
}

export const findIncomingLeadMatch = <T extends IncomingLeadIdentity>(
  leads: T[],
  mobile: string,
  projectId: string | null,
  assignedToId: string | null,
) => leads.find(lead =>
  normalizeRoutingPhone(lead.mobile) === normalizeRoutingPhone(mobile)
  && lead.projectId === projectId
  && lead.assignedToId === assignedToId,
)

export const planIncomingLead = <T extends IncomingLeadIdentity>(
  leads: T[],
  mobile: string,
  projectId: string | null,
  assignedToId: string | null,
): IncomingLeadPlan<T> => {
  const lead = findIncomingLeadMatch(leads, mobile, projectId, assignedToId)
  return lead ? { action: 'reuse', lead } : { action: 'create' }
}

export const hasIncomingCallIdBeenProcessed = (callId: string, existingCallId: string | null | undefined) =>
  Boolean(callId && existingCallId && callId === existingCallId)

export const chooseIncomingCallAgent = (
  assignedAgents: IncomingCallAgent[],
  answeringAgent: IncomingCallAgent | undefined,
  roundRobinIndex: number,
  hasDidMapping: boolean,
) => {
  if (answeringAgent && assignedAgents.some(agent => agent.id === answeringAgent.id)) return answeringAgent
  if (assignedAgents.length) return assignedAgents[((roundRobinIndex % assignedAgents.length) + assignedAgents.length) % assignedAgents.length]
  return hasDidMapping ? undefined : answeringAgent
}

export const getIncomingCallId = (payload: Record<string, unknown>) =>
  String(payload.callid || payload.call_id || payload.id || '').trim()
