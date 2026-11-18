import type { Prisma } from '@prisma/client'

export const chooseProjectLeadAgent = (
  agentIds: string[],
  roundRobinCursor: number,
) => {
  if (!agentIds.length) return null
  const cursor = Number.isSafeInteger(roundRobinCursor) && roundRobinCursor >= 0
    ? roundRobinCursor
    : 0
  return agentIds[cursor % agentIds.length]
}

export const assignProjectLeadRoundRobin = async (
  transaction: Prisma.TransactionClient,
  projectId: string | null | undefined,
) => {
  if (!projectId) return null

  await transaction.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${projectId}, 0))) AS advisory_lock`

  const mappings = await transaction.incomingCallDid.findMany({
    where: { projectId, isActive: true },
    orderBy: { did: 'asc' },
    include: {
      assignedAgents: {
        where: { user: { isActive: true } },
        orderBy: { position: 'asc' },
        include: { user: { select: { id: true } } },
      },
    },
  })

  const agentIds: string[] = []
  for (const mapping of mappings) {
    for (const assignment of mapping.assignedAgents) {
      if (!agentIds.includes(assignment.user.id)) agentIds.push(assignment.user.id)
    }
  }
  if (!agentIds.length) return null

  const project = await transaction.project.update({
    where: { id: projectId },
    data: { leadRoundRobinCursor: { increment: 1 } },
    select: { leadRoundRobinCursor: true },
  })

  return chooseProjectLeadAgent(agentIds, project.leadRoundRobinCursor - 1)
}
