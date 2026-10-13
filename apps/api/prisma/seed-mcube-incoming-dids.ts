import { PrismaClient, IncomingCallChannel } from '@prisma/client'

const prisma = new PrismaClient()

const routes = [
  { did: '9071126875', projects: ['Hara Rassai Vijayam', 'Hara Vijayam', 'Hara Rassai Vijayam - Digital'], channel: 'DIGITAL', agents: ['Mahesh', 'Maruthi', 'Kalyani', 'Nithin'], outgoingDid: '8071439257' },
  { did: '9071126947', projects: ['Hara Rassai Vijayam', 'Hara Vijayam', 'Hara Rassai Vijayam - ATL/BTL'], channel: 'ATL_BTL', agents: ['Mahesh', 'Maruthi', 'Kalyani', 'Nithin'], outgoingDid: '8071439583' },
  { did: '9071127087', projects: ['Lake Estate', 'Lake Estate - Digital'], channel: 'DIGITAL', agents: ['Chirag', 'Amar'], outgoingDid: '8071439584' },
  { did: '9071127140', projects: ['Lake Estate', 'Lake Estate - ATL/BTL'], channel: 'ATL_BTL', agents: ['Chirag', 'Amar'], outgoingDid: '8071439584' },
  { did: '9071127154', projects: ['Primia', 'SA Global - Primia', 'SA Global - Primia - Digital'], channel: 'DIGITAL', agents: ['Vinod', 'Amar'], outgoingDid: '8071439585' },
  { did: '9071127168', projects: ['SA Global - Verzure', 'SA Global - Verzure - Digital'], channel: 'DIGITAL', agents: ['Vinod', 'Amar'], outgoingDid: '8071439585' },
] satisfies Array<{
  did: string
  projects: string[]
  channel: IncomingCallChannel
  agents: string[]
  outgoingDid: string
}>

const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()

async function main() {
  const projects = await prisma.project.findMany({ select: { id: true, name: true } })
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } })
  const created: string[] = []
  const updated: string[] = []
  const missing: string[] = []

  for (const route of routes) {
    const project = route.projects
      .map(name => projects.find(candidate => normalizeName(candidate.name) === normalizeName(name)))
      .find(Boolean)
    const assignedUsers = route.agents.map(name => ({
      requestedName: name,
      user: users.find(candidate => normalizeName(candidate.name) === normalizeName(name)),
    }))
    if (!project) missing.push(`Project: ${route.projects.join(' or ')} (DID ${route.did})`)
    for (const entry of assignedUsers) {
      if (!entry.user) missing.push(`Active user: ${entry.requestedName} (DID ${route.did})`)
    }

    const existing = await prisma.incomingCallDid.findUnique({ where: { did: route.did }, select: { id: true } })
    const didMapping = await prisma.incomingCallDid.upsert({
      where: { did: route.did },
      update: {
        ...(project ? { projectId: project.id } : {}),
        channel: route.channel,
        outgoingDid: route.outgoingDid,
        isActive: true,
      },
      create: {
        did: route.did,
        projectId: project?.id,
        channel: route.channel,
        outgoingDid: route.outgoingDid,
        isActive: true,
      },
    })

    for (const [position, entry] of assignedUsers.entries()) {
      if (!entry.user) continue
      await prisma.incomingCallDidAgent.upsert({
        where: { incomingCallDidId_userId: { incomingCallDidId: didMapping.id, userId: entry.user.id } },
        update: { position },
        create: { incomingCallDidId: didMapping.id, userId: entry.user.id, position },
      })
    }

    const result = existing ? updated : created
    result.push(route.did)
  }

  console.info('[Voice] MCUBE DID seed complete', { created, updated, missing })
}

main()
  .catch(error => {
    console.error('[Voice] MCUBE DID seed failed', error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
