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
  { agentName: 'Maruthi', outgoingDid: '8071439257' },
  { agentName: 'Kalyani', outgoingDid: '8071439257' },
  { agentName: 'Mahesh', outgoingDid: '8071439257' },
  { agentName: 'Nithin', outgoingDid: '8071439583' },
  { agentName: 'Maruthi', outgoingDid: '8071439583' },
  { agentName: 'Kalyani', outgoingDid: '8071439583' },
  { agentName: 'Mahesh', outgoingDid: '8071439583' },
  { agentName: 'Chirag', outgoingDid: '8071439584' },
  { agentName: 'Amar', outgoingDid: '8071439584' },
  { agentName: 'Vinod', outgoingDid: '8071439585' },
  { agentName: 'Admin', outgoingDid: '8071439585' },
]

const normalizeAgentName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const canonicalizeOutgoingDidRoutes = (routes: OutgoingDidRoute[]) => {
  const fixedAgentNames = new Set([
    ...DEFAULT_OUTGOING_DID_ROUTES.map(route => normalizeAgentName(route.agentName)),
    'superadmin',
    'administrator',
  ])
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

  const seenRoutes = new Set<string>()
  const routes = value.map((route, index) => {
    if (!route || typeof route !== 'object') throw new Error(`Outgoing DID route ${index + 1} must be an object`)
    const agentName = typeof route.agentName === 'string' ? route.agentName.trim() : ''
    const outgoingDid = normalizeRoutingPhone(route.outgoingDid)
    const normalizedAgent = normalizeAgentName(agentName)
    if (!agentName || !outgoingDid) throw new Error(`Outgoing DID route ${index + 1} requires an agent name and valid DID`)
    const routeKey = `${normalizedAgent}:${outgoingDid}`
    if (seenRoutes.has(routeKey)) throw new Error(`Outgoing DID ${outgoingDid} for ${agentName} is configured more than once`)
    seenRoutes.add(routeKey)
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

export const getOutgoingDidsForAgent = (routes: OutgoingDidRoute[], agentName?: string | null, role?: string | null) => {
  if (agentName?.trim()) {
    const normalizedName = normalizeAgentName(agentName)
    const canonicalNames = new Set(['mahesh', 'maruthi', 'kalyani', 'nithin', 'chirag', 'amar', 'vinod', 'admin'])
    const canonicalName = [...canonicalNames].find(name => normalizedName === name || normalizedName.startsWith(name))
    const matches = routes.filter(route => {
      const routeName = normalizeAgentName(route.agentName)
      return canonicalName ? routeName === canonicalName : routeName === normalizedName
    })
    const dids = [...new Set(matches.map(route => route.outgoingDid))]
    if (dids.length) return dids
  }

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return ['8071439585']
  return undefined
}

export const findOutgoingDidForAgent = (
  routes: OutgoingDidRoute[],
  agentName?: string | null,
  role?: string | null,
  callIndex = 0,
) => {
  const dids = getOutgoingDidsForAgent(routes, agentName, role)
  if (!dids?.length) return undefined
  const safeIndex = Number.isSafeInteger(callIndex) && callIndex >= 0 ? callIndex : 0
  return dids[safeIndex % dids.length]
}
