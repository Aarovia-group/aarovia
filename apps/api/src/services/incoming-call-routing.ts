export interface IncomingCallRoute {
  incomingNumber: string
  agentPhone: string
  agentName: string
}

export interface OutgoingDidRoute {
  agentName: string
  outgoingDid: string
}

export const DEFAULT_INCOMING_CALL_ROUTES: IncomingCallRoute[] = [
  { incomingNumber: '9071126875', agentPhone: '9187980598', agentName: 'maruthi' },
  { incomingNumber: '9071126947', agentPhone: '9187980593', agentName: 'Nithin' },
  { incomingNumber: '9071127087', agentPhone: '9187980599', agentName: 'chirag' },
  { incomingNumber: '9071127140', agentPhone: '9187980599', agentName: 'chirag' },
  { incomingNumber: '9071127154', agentPhone: '9187980594', agentName: 'vinod' },
  { incomingNumber: '9071127168', agentPhone: '9187980594', agentName: 'vinod' },
]

export const DEFAULT_OUTGOING_DID_ROUTES: OutgoingDidRoute[] = [
  { agentName: 'Nithin', outgoingDid: '8071439257' },
  { agentName: 'Maruthi', outgoingDid: '8071439583' },
  { agentName: 'Chirag', outgoingDid: '8071439584' },
  { agentName: 'Vinod', outgoingDid: '8071439585' },
]

const normalizeAgentName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const canonicalizeOutgoingDidRoutes = (routes: OutgoingDidRoute[]) => {
  const fixedAgentNames = new Set(DEFAULT_OUTGOING_DID_ROUTES.map(route => normalizeAgentName(route.agentName)))
  const additionalRoutes = routes.filter(route => !fixedAgentNames.has(normalizeAgentName(route.agentName)))
  return [...DEFAULT_OUTGOING_DID_ROUTES, ...additionalRoutes]
}

export const normalizeRoutingPhone = (value: unknown) => {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : ''
}

export const validateIncomingCallRoutes = (value: unknown): IncomingCallRoute[] => {
  if (!Array.isArray(value)) throw new Error('Incoming call routes must be an array')

  const seenNumbers = new Set<string>()
  return value.map((route, index) => {
    if (!route || typeof route !== 'object') {
      throw new Error(`Incoming route ${index + 1} must be an object`)
    }

    const incomingNumber = normalizeRoutingPhone(route.incomingNumber)
    const agentPhone = normalizeRoutingPhone(route.agentPhone)
    const agentName = typeof route.agentName === 'string' ? route.agentName.trim() : ''

    if (!incomingNumber || !agentPhone || !agentName) {
      throw new Error(`Incoming route ${index + 1} requires a valid phone number and agent name`)
    }
    if (seenNumbers.has(incomingNumber)) {
      throw new Error(`Incoming number ${incomingNumber} is configured more than once`)
    }

    seenNumbers.add(incomingNumber)
    return { incomingNumber, agentPhone, agentName }
  })
}

export const parseIncomingCallRoutes = (value?: string | null): IncomingCallRoute[] => {
  if (!value) return DEFAULT_INCOMING_CALL_ROUTES

  try {
    return validateIncomingCallRoutes(JSON.parse(value))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid incoming call routing settings'
    throw new Error(`Unable to read incoming call routing settings: ${message}`)
  }
}

export const validateOutgoingDidRoutes = (value: unknown): OutgoingDidRoute[] => {
  if (!Array.isArray(value)) throw new Error('Outgoing DID routes must be an array')

  const seenAgents = new Set<string>()
  const routes = value.map((route, index) => {
    if (!route || typeof route !== 'object') throw new Error(`Outgoing DID route ${index + 1} must be an object`)
    const agentName = typeof route.agentName === 'string' ? route.agentName.trim() : ''
    const outgoingDid = normalizeRoutingPhone(route.outgoingDid)
    const normalizedAgent = normalizeAgentName(agentName)
    if (!agentName || !outgoingDid) throw new Error(`Outgoing DID route ${index + 1} requires an agent name and valid DID`)
    if (seenAgents.has(normalizedAgent)) throw new Error(`Outgoing DID for ${agentName} is configured more than once`)
    seenAgents.add(normalizedAgent)
    return { agentName, outgoingDid }
  })
  return canonicalizeOutgoingDidRoutes(routes)
}

export const parseOutgoingDidRoutes = (value?: string | null): OutgoingDidRoute[] => {
  if (!value) return DEFAULT_OUTGOING_DID_ROUTES
  try {
    return validateOutgoingDidRoutes(JSON.parse(value))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid outgoing DID settings'
    throw new Error(`Unable to read outgoing DID settings: ${message}`)
  }
}

export const findOutgoingDidForAgent = (routes: OutgoingDidRoute[], agentName?: string | null) => {
  if (!agentName?.trim()) return undefined
  const normalizedName = normalizeAgentName(agentName)
  const canonicalRoute = DEFAULT_OUTGOING_DID_ROUTES.find(route => {
    const canonicalName = normalizeAgentName(route.agentName)
    return normalizedName === canonicalName || normalizedName.startsWith(canonicalName)
  })
  if (canonicalRoute) return canonicalRoute.outgoingDid
  return routes.find(route => normalizeAgentName(route.agentName) === normalizedName)?.outgoingDid
}
