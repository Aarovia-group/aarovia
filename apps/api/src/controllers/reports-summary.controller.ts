import { Request, Response } from 'express'
import prisma from '../utils/prisma'

const PROJECT_NAMES = ['Hara Rassai Vijayam', 'Primia', 'Lake Estate', 'Quiet Estate'] as const
const EXECUTIVE_NAMES = ['Nithin', 'Mahesh', 'Maruthi', 'Kalyani', 'Vinod', 'Chirag'] as const
const LEAD_STAGES = [
  'NEW',
  'FOLLOWUP',
  'INTERESTED',
  'QUALIFIED',
  'SITE_VISIT_FIXED',
  'SITE_VISIT_DONE',
  'OPPORTUNITY',
  'OPPORTUNITY_FOLLOW',
  'OPPORTUNITY_INTERESTED',
  'OPPORTUNITY_NOT_INTERESTED',
  'OPPORTUNITY_CLOSED',
  'BOOKED',
] as const

type LeadStage = typeof LEAD_STAGES[number]

interface Metrics {
  total: number
  qualified: number
  interested: number
  siteVisitFixed: number
  siteVisitDone: number
}

const emptyMetrics = (): Metrics => ({
  total: 0,
  qualified: 0,
  interested: 0,
  siteVisitFixed: 0,
  siteVisitDone: 0,
})

const addCount = (metrics: Metrics, status: LeadStage, count: number) => {
  const stageIndex = LEAD_STAGES.indexOf(status)
  metrics.total += count
  if (stageIndex >= LEAD_STAGES.indexOf('QUALIFIED')) metrics.qualified += count
  if (stageIndex >= LEAD_STAGES.indexOf('INTERESTED')) metrics.interested += count
  if (stageIndex >= LEAD_STAGES.indexOf('SITE_VISIT_FIXED')) metrics.siteVisitFixed += count
  if (stageIndex >= LEAD_STAGES.indexOf('SITE_VISIT_DONE')) metrics.siteVisitDone += count
}

const withPercentages = (metrics: Metrics) => ({
  ...metrics,
  qualifiedPct: metrics.total ? Number(((metrics.qualified / metrics.total) * 100).toFixed(1)) : 0,
  interestedPct: metrics.total ? Number(((metrics.interested / metrics.total) * 100).toFixed(1)) : 0,
  siteVisitFixedPct: metrics.total ? Number(((metrics.siteVisitFixed / metrics.total) * 100).toFixed(1)) : 0,
  siteVisitDonePct: metrics.total ? Number(((metrics.siteVisitDone / metrics.total) * 100).toFixed(1)) : 0,
})

const parseDate = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date
}

export const getReportsSummary = async (req: Request, res: Response) => {
  try {
    const from = parseDate(req.query.from)
    const to = parseDate(req.query.to)
    if (!from || !to || from > to) {
      return res.status(400).json({ success: false, message: 'Valid from and to dates are required' })
    }

    const rawProjects = req.query.projects
    const projectFilterWasProvided = typeof rawProjects === 'string'
    const selectedProjects = typeof rawProjects === 'string' && rawProjects.length
      ? rawProjects.split(',').filter(name => PROJECT_NAMES.includes(name as typeof PROJECT_NAMES[number]))
      : []
    if (typeof rawProjects === 'string' && rawProjects.length && selectedProjects.length !== rawProjects.split(',').length) {
      return res.status(400).json({ success: false, message: 'Invalid project filter' })
    }

    const projectFilterIsPartial = projectFilterWasProvided && selectedProjects.length < PROJECT_NAMES.length
    const projects = await prisma.project.findMany({
      where: { name: { in: [...PROJECT_NAMES] } },
      select: { id: true, name: true },
    })
    const projectNameById = new Map(projects.map(project => [project.id, project.name]))
    const selectedProjectIds = projectFilterIsPartial
      ? projects.filter(project => selectedProjects.includes(project.name)).map(project => project.id)
      : undefined

    const [groups, executives] = await Promise.all([
      prisma.lead.groupBy({
        by: ['projectId', 'assignedToId', 'source', 'status'],
        where: {
          createdAt: { gte: from, lt: new Date(to.getTime() + 24 * 60 * 60 * 1000) },
          ...(selectedProjectIds ? { projectId: { in: selectedProjectIds } } : {}),
        },
        _count: { id: true },
      }),
      prisma.user.findMany({
        where: { name: { in: [...EXECUTIVE_NAMES] } },
        select: { id: true, name: true },
      }),
    ])

    const executiveNameById = new Map(executives.map(executive => [executive.id, executive.name]))
    const total = emptyMetrics()
    const byProject = new Map<string, Metrics>(PROJECT_NAMES.map(name => [name, emptyMetrics()]))
    const otherProjects = emptyMetrics()
    const byExecutive = new Map<string, Metrics>(EXECUTIVE_NAMES.map(name => [name, emptyMetrics()]))
    const bySource = new Map<string, Metrics>([
      ['Meta', emptyMetrics()],
      ['Google Ads', emptyMetrics()],
      ['Direct', emptyMetrics()],
      ['ATL/BTL', emptyMetrics()],
      ['Walk-in', emptyMetrics()],
      ['Other', emptyMetrics()],
    ])

    for (const group of groups) {
      const status = group.status as LeadStage
      const count = group._count.id
      addCount(total, status, count)

      const projectName = group.projectId ? projectNameById.get(group.projectId) : undefined
      addCount(projectName && byProject.has(projectName) ? byProject.get(projectName)! : otherProjects, status, count)

      const executiveName = group.assignedToId ? executiveNameById.get(group.assignedToId) : undefined
      if (executiveName) addCount(byExecutive.get(executiveName)!, status, count)

      const sourceName = group.source === 'FACEBOOK' || group.source === 'META_ADS'
        ? 'Meta'
        : group.source === 'GOOGLE_ADS'
          ? 'Google Ads'
          : group.source === 'DIRECT_CALL'
            ? 'Direct'
            : group.source === 'WALK_IN'
              ? 'Walk-in'
              : 'Other'
      addCount(bySource.get(sourceName)!, status, count)
    }

    res.json({
      success: true,
      data: {
        projects: PROJECT_NAMES.map(name => ({ name, ...withPercentages(byProject.get(name)!) })),
        otherProjects: withPercentages(otherProjects),
        executives: EXECUTIVE_NAMES.map(name => ({ name, ...withPercentages(byExecutive.get(name)!) })),
        sources: ['Meta', 'Google Ads', 'Direct', 'ATL/BTL', 'Walk-in', 'Other'].map(name => ({
          name,
          ...withPercentages(bySource.get(name)!),
        })),
        grandTotal: withPercentages(total),
        projectFilter: projectFilterIsPartial ? selectedProjects : [...PROJECT_NAMES],
      },
    })
  } catch (error) {
    console.error('[Reports Summary] Failed to fetch report', error)
    res.status(500).json({ success: false, message: 'Failed to fetch reports summary' })
  }
}
