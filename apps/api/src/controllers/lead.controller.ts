import { Request, Response } from 'express'
import { LeadSource, LeadStatus, PropertyType } from '@prisma/client'
import prisma from '../utils/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getLeads = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1', limit = '20', status, source, assignedToId,
      search, projectId, from, to, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const where: any = { isActive: true }

    if (status) where.status = status
    if (source) where.source = source
    if (assignedToId) where.assignedToId = assignedToId as string
    if (projectId) where.projectId = projectId as string
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from as string)
      if (to) where.createdAt.lte = new Date(to as string)
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { mobile: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    // Role-based filtering
    if (req.user?.role === 'SALES_EXECUTIVE' || req.user?.role === 'TELECALLER') {
      where.assignedToId = req.user.id
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { activities: true, callLogs: true, tasks: true } },
        },
      }),
      prisma.lead.count({ where }),
    ])

    res.json({
      success: true,
      data: leads,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leads', error })
  }
}

export const getLeadById = async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true, email: true } },
        project: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
        callLogs: { orderBy: { calledAt: 'desc' }, take: 10, include: { user: { select: { name: true } } } },
        tasks: { where: { isCompleted: false }, orderBy: { dueDate: 'asc' } },
        quotations: { orderBy: { createdAt: 'desc' } },
        siteVisits: { orderBy: { scheduledAt: 'desc' } },
        emailLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
        whatsappLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, to: true, message: true, status: true, createdAt: true, leadId: true },
        },
        notes: { orderBy: { createdAt: 'desc' } },
        booking: { include: { customer: true, inventory: true } },
      },
    })

    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' })
    res.json({ success: true, data: lead })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch lead', error })
  }
}

export const createLead = async (req: AuthRequest, res: Response) => {
  try {
    const { name, mobile, email, budget, city, source, status, propertyType,
      projectId, assignedToId, remarks, tags, nextFollowupDate } = req.body

    // Duplicate detection
    const duplicate = await prisma.lead.findFirst({
      where: { mobile, isActive: true },
    })

    const lead = await prisma.lead.create({
      data: {
        name, mobile, email, budget: budget ? parseFloat(budget) : null,
        city, source, status: status || 'NEW', propertyType,
        projectId, assignedToId: assignedToId || req.user?.id,
        createdById: req.user?.id, remarks, tags: tags || [],
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate) : null,
        isDuplicate: !!duplicate,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        leadId: lead.id, userId: req.user?.id,
        type: 'LEAD_CREATED', description: `Lead created by ${req.user?.name}`,
      },
    })

    res.status(201).json({ success: true, message: 'Lead created successfully', data: lead })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create lead', error })
  }
}

export const updateLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const updateData = { ...req.body }
    if (updateData.budget) updateData.budget = parseFloat(updateData.budget)
    if (updateData.nextFollowupDate) updateData.nextFollowupDate = new Date(updateData.nextFollowupDate)

    const oldLead = await prisma.lead.findUnique({ where: { id } })
    let assignedUserName = ''
    if (updateData.assignedToId !== undefined && updateData.assignedToId !== oldLead?.assignedToId) {
      if (updateData.assignedToId) {
        const assignedUser = await prisma.user.findFirst({ where: { id: updateData.assignedToId, isActive: true }, select: { name: true } })
        if (!assignedUser) return res.status(400).json({ success: false, message: 'An active team member is required' })
        assignedUserName = assignedUser.name
      }
    }
    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: { assignedTo: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
    })

    // Log status change
    if (oldLead?.status !== lead.status) {
      await prisma.activity.create({
        data: {
          leadId: id, userId: req.user?.id,
          type: 'STATUS_CHANGED',
          description: `Status changed from ${oldLead?.status} to ${lead.status}`,
          metadata: { from: oldLead?.status, to: lead.status },
        },
      })
    }

    if (updateData.assignedToId !== undefined && updateData.assignedToId !== oldLead?.assignedToId) {
      await prisma.activity.create({
        data: {
          leadId: id, userId: req.user?.id,
          type: 'LEAD_ASSIGNED',
          description: assignedUserName ? `Lead assigned to ${assignedUserName}` : 'Lead assignment removed',
          metadata: { assignedToId: updateData.assignedToId || null, previousAssignedToId: oldLead?.assignedToId || null },
        },
      })
    }

    res.json({ success: true, message: 'Lead updated successfully', data: lead })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update lead', error })
  }
}

export const deleteLead = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.lead.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ success: true, message: 'Lead deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete lead', error })
  }
}

export const activateLead = async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: { isActive: true } })
    await prisma.activity.create({
      data: { leadId: lead.id, userId: req.user?.id, type: 'LEAD_ACTIVATED', description: 'Lead activated' },
    })
    res.json({ success: true, message: 'Lead activated successfully', data: lead })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to activate lead', error })
  }
}

export const updateLeadStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, remarks } = req.body
    const validStatuses = ['NEW', 'FOLLOWUP', 'INTERESTED', 'QUALIFIED', 'SITE_VISIT_FIXED', 'SITE_VISIT_DONE', 'OPPORTUNITY', 'OPPORTUNITY_FOLLOW', 'OPPORTUNITY_INTERESTED', 'OPPORTUNITY_NOT_INTERESTED', 'OPPORTUNITY_CLOSED', 'BOOKED']
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'A valid lead status is required' })

    const lead = await prisma.lead.update({
      where: { id },
      data: { status, remarks },
    })

    await prisma.activity.create({
      data: {
        leadId: id, userId: req.user?.id,
        type: 'STATUS_CHANGED',
        description: `Status updated to ${status}${remarks ? ': ' + remarks : ''}`,
        metadata: { status, remarks },
      },
    })

    res.json({ success: true, message: 'Status updated', data: lead })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status', error })
  }
}

export const assignLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { assignedToId } = req.body

    const user = await prisma.user.findFirst({ where: { id: assignedToId, isActive: true }, select: { name: true } })
    if (!user) return res.status(400).json({ success: false, message: 'An active team member is required' })
    const lead = await prisma.lead.update({ where: { id }, data: { assignedToId } })

    await prisma.activity.create({
      data: {
        leadId: id, userId: req.user?.id,
        type: 'LEAD_ASSIGNED',
        description: `Lead assigned to ${user?.name}`,
        metadata: { assignedToId },
      },
    })

    res.json({ success: true, message: 'Lead assigned successfully', data: lead })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign lead', error })
  }
}

export const bulkAssignLeads = async (req: AuthRequest, res: Response) => {
  try {
    const { leadIds, assignedToId } = req.body
    if (!Array.isArray(leadIds) || leadIds.length === 0 || !assignedToId) {
      return res.status(400).json({ success: false, message: 'Lead IDs and an assignee are required' })
    }
    const user = await prisma.user.findFirst({ where: { id: assignedToId, isActive: true }, select: { name: true } })
    if (!user) return res.status(400).json({ success: false, message: 'An active team member is required' })

    await prisma.$transaction([
      prisma.lead.updateMany({ where: { id: { in: leadIds }, isActive: true }, data: { assignedToId } }),
      ...leadIds.map((leadId: string) => prisma.activity.create({
        data: { leadId, userId: req.user?.id, type: 'LEAD_ASSIGNED', description: `Lead assigned to ${user.name}`, metadata: { assignedToId, bulk: true } },
      })),
    ])

    res.json({ success: true, message: `${leadIds.length} leads assigned successfully` })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign leads', error })
  }
}

export const transferAgentLeads = async (req: AuthRequest, res: Response) => {
  try {
    const { fromAssignedToId, toAssignedToId } = req.body || {}
    if (
      typeof fromAssignedToId !== 'string'
      || !fromAssignedToId.trim()
      || typeof toAssignedToId !== 'string'
      || !toAssignedToId.trim()
    ) {
      return res.status(400).json({ success: false, message: 'Source and destination team members are required' })
    }
    if (fromAssignedToId === toAssignedToId) {
      return res.status(400).json({ success: false, message: 'Choose two different team members' })
    }

    const [sourceUser, destinationUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromAssignedToId }, select: { id: true, name: true } }),
      prisma.user.findFirst({ where: { id: toAssignedToId, isActive: true }, select: { id: true, name: true } }),
    ])
    if (!sourceUser) return res.status(404).json({ success: false, message: 'Source team member not found' })
    if (!destinationUser) return res.status(400).json({ success: false, message: 'An active destination team member is required' })

    const transferredCount = await prisma.$transaction(async transaction => {
      const leads = await transaction.lead.findMany({
        where: { assignedToId: sourceUser.id, isActive: true },
        select: { id: true },
      })
      if (!leads.length) return 0

      const updateResult = await transaction.lead.updateMany({
        where: { id: { in: leads.map(lead => lead.id) }, assignedToId: sourceUser.id, isActive: true },
        data: { assignedToId: destinationUser.id },
      })
      if (updateResult.count !== leads.length) {
        throw Object.assign(new Error('Lead assignments changed while the transfer was in progress; refresh and try again'), { statusCode: 409 })
      }
      await transaction.activity.createMany({
        data: leads.map(lead => ({
          leadId: lead.id,
          userId: req.user?.id,
          type: 'LEAD_ASSIGNED',
          description: `Lead transferred from ${sourceUser.name} to ${destinationUser.name}`,
          metadata: {
            previousAssignedToId: sourceUser.id,
            assignedToId: destinationUser.id,
            bulkTransfer: true,
          },
        })),
      })
      return leads.length
    }, { maxWait: 10000, timeout: 30000 })

    return res.json({
      success: true,
      message: transferredCount
        ? `${transferredCount} active leads transferred from ${sourceUser.name} to ${destinationUser.name}`
        : `No active leads are currently assigned to ${sourceUser.name}`,
      data: { count: transferredCount, from: sourceUser.name, to: destinationUser.name },
    })
  } catch (error) {
    console.error('[Leads] Failed to transfer agent leads', error)
    const statusCode = (error as { statusCode?: number })?.statusCode || 500
    const message = statusCode === 409 && error instanceof Error
      ? error.message
      : 'Failed to transfer agent leads'
    return res.status(statusCode).json({ success: false, message })
  }
}

export const bulkAssignProject = async (req: AuthRequest, res: Response) => {
  try {
    const { leadIds, projectId } = req.body
    if (!Array.isArray(leadIds) || leadIds.length === 0 || !projectId) {
      return res.status(400).json({ success: false, message: 'Lead IDs and a project are required' })
    }

    const project = await prisma.project.findFirst({ where: { id: projectId, isActive: true }, select: { name: true } })
    if (!project) return res.status(400).json({ success: false, message: 'An active project is required' })

    await prisma.$transaction([
      prisma.lead.updateMany({ where: { id: { in: leadIds }, isActive: true }, data: { projectId } }),
      ...leadIds.map((leadId: string) => prisma.activity.create({
        data: { leadId, userId: req.user?.id, type: 'LEAD_UPDATED', description: `Lead assigned to project ${project.name}`, metadata: { projectId, bulk: true } },
      })),
    ])

    res.json({ success: true, message: `${leadIds.length} leads assigned to ${project.name}` })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign project to leads', error })
  }
}

export const addCallLog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { duration, outcome, notes, recordingUrl } = req.body

    const callLog = await prisma.callLog.create({
      data: { leadId: id, userId: req.user!.id, duration, outcome, notes, recordingUrl: recordingUrl || null },
    })

    await prisma.activity.create({
      data: {
        leadId: id, userId: req.user?.id,
        type: 'CALL_LOGGED',
        description: `Call logged - ${outcome || 'No outcome'}. Duration: ${duration || 0}s`,
      },
    })

    res.status(201).json({ success: true, message: 'Call logged', data: callLog })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to log call', error })
  }
}

export const updateCallLog = async (req: AuthRequest, res: Response) => {
  try {
    const { outcome, notes } = req.body || {}
    const disposition = typeof outcome === 'string' ? outcome.trim() : ''
    if (!disposition) return res.status(400).json({ success: false, message: 'Call disposition is required' })

    const callLog = await prisma.callLog.findFirst({
      where: { id: req.params.callId, leadId: req.params.id },
    })
    if (!callLog) return res.status(404).json({ success: false, message: 'Call log not found' })

    const providerNotes = (callLog.notes || '').split(' | Agent details: ')[0]
    const agentDetails = typeof notes === 'string' ? notes.trim() : ''
    const updated = await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        outcome: disposition,
        notes: [providerNotes, agentDetails ? `Agent details: ${agentDetails}` : ''].filter(Boolean).join(' | ') || null,
      },
    })

    await prisma.activity.create({
      data: {
        leadId: req.params.id,
        userId: req.user?.id,
        type: 'CALL_LOGGED',
        description: `Call disposition updated - ${disposition}`,
        metadata: { callLogId: callLog.id },
      },
    })

    return res.json({ success: true, message: 'Call details updated', data: updated })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update call details', error })
  }
}

export const deleteCallLog = async (req: AuthRequest, res: Response) => {
  try {
    const callLog = await prisma.callLog.findFirst({
      where: { id: req.params.callId, leadId: req.params.id },
    })

    if (!callLog) return res.status(404).json({ success: false, message: 'Call log not found' })

    await prisma.callLog.delete({ where: { id: callLog.id } })
    res.json({ success: true, message: 'Call log deleted' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete call log', error })
  }
}

export const deleteCallLogs = async (req: AuthRequest, res: Response) => {
  try {
    const callIds = Array.isArray(req.body?.callIds)
      ? req.body.callIds.filter((callId: unknown): callId is string => typeof callId === 'string' && callId.length > 0)
      : []

    if (callIds.length === 0) return res.status(400).json({ success: false, message: 'At least one call log is required' })

    const result = await prisma.callLog.deleteMany({
      where: { leadId: req.params.id, id: { in: callIds } },
    })

    res.json({ success: true, message: `${result.count} call log(s) deleted`, data: { count: result.count } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete call logs', error })
  }
}

export const addNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
    if (!content) return res.status(400).json({ success: false, message: 'Note content is required' })

    const note = await prisma.note.create({ data: { leadId: id, content } })
    await prisma.activity.create({
      data: {
        leadId: id, userId: req.user?.id,
        type: 'NOTE_ADDED', description: `Note added: ${content.substring(0, 50)}...`,
      },
    })

    res.status(201).json({ success: true, data: note })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add note', error })
  }
}

export const scheduleSiteVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { scheduledAt, notes } = req.body
    if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
      return res.status(400).json({ success: false, message: 'A valid visit date is required' })
    }

    const visit = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id } })
      if (!lead) throw Object.assign(new Error('Lead not found'), { statusCode: 404 })
      const createdVisit = await tx.siteVisit.create({ data: { leadId: id, scheduledAt: new Date(scheduledAt), notes } })
      await tx.lead.update({ where: { id }, data: { status: 'SITE_VISIT_FIXED' } })
      await tx.activity.create({
        data: { leadId: id, userId: req.user?.id, type: 'SITE_VISIT_SCHEDULED', description: `Site visit scheduled for ${new Date(scheduledAt).toLocaleString()}` },
      })
      return createdVisit
    })

    res.status(201).json({ success: true, message: 'Site visit scheduled', data: visit })
  } catch (error) {
    const statusCode = (error as any)?.statusCode
    res.status(statusCode || 500).json({ success: false, message: statusCode ? (error as Error).message : 'Failed to schedule site visit', error })
  }
}

export const getPipelineLeads = async (req: AuthRequest, res: Response) => {
  try {
    const statuses = ['NEW', 'FOLLOWUP', 'INTERESTED', 'QUALIFIED', 'SITE_VISIT_FIXED', 'SITE_VISIT_DONE', 'OPPORTUNITY', 'BOOKED']
    const where: any = { isActive: true }

    if (req.user?.role === 'SALES_EXECUTIVE') where.assignedToId = req.user.id

    const pipeline = await Promise.all(
      statuses.map(async (status) => {
        const leads = await prisma.lead.findMany({
          where: { ...where, status: status as any },
          take: 10,
          orderBy: { updatedAt: 'desc' },
          include: { assignedTo: { select: { id: true, name: true } }, project: { select: { name: true } } },
        })
        const count = await prisma.lead.count({ where: { ...where, status: status as any } })
        return { status, leads, count }
      })
    )

    res.json({ success: true, data: pipeline })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch pipeline', error })
  }
}

export const bulkImportLeads = async (req: AuthRequest, res: Response) => {
  try {
    const leads = req.body?.leads
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide at least one lead to import' })
    }
    if (leads.length > 1000) {
      return res.status(400).json({ success: false, message: 'Import up to 1,000 leads per request' })
    }

    const validSources: string[] = Object.values(LeadSource)
    const validStatuses: string[] = Object.values(LeadStatus)
    const validPropertyTypes: string[] = Object.values(PropertyType)
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })
    const activeProjects = await prisma.project.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })
    const usersByName = new Map<string, string[]>()
    for (const user of activeUsers) {
      const key = user.name.trim().replace(/\s+/g, ' ').toLowerCase()
      usersByName.set(key, [...(usersByName.get(key) || []), user.id])
    }
    const projectsByName = new Map<string, string[]>()
    for (const project of activeProjects) {
      const key = project.name.trim().replace(/\s+/g, ' ').toLowerCase()
      projectsByName.set(key, [...(projectsByName.get(key) || []), project.id])
    }
    const results: { created: number; duplicates: number; errors: number; rowErrors: { row: number; message: string }[] } = {
      created: 0,
      duplicates: 0,
      errors: 0,
      rowErrors: [],
    }

    for (const [index, leadData] of leads.entries()) {
      let name = ''
      let mobile = ''
      let source = ''
      let status = ''
      let propertyType: string | null = null
      let budget: number | null = null
      let nextFollowupDate: Date | null = null

      try {
        if (!leadData || typeof leadData !== 'object' || Array.isArray(leadData)) {
          throw new Error('Invalid lead data')
        }
        name = typeof leadData.name === 'string' ? leadData.name.trim() : ''
        mobile = typeof leadData.mobile === 'string' ? leadData.mobile.trim() : ''
        const mobileDigits = mobile.replace(/\D/g, '')
        if (!mobile.startsWith('+') && mobileDigits.length === 10 && /^[6-9]/.test(mobileDigits)) {
          mobile = `+91${mobileDigits}`
        } else if (!mobile.startsWith('+') && mobileDigits.length === 11 && mobileDigits.startsWith('0') && /^[6-9]/.test(mobileDigits.slice(1))) {
          mobile = `+91${mobileDigits.slice(1)}`
        } else if (mobile.startsWith('+')) {
          mobile = `+${mobileDigits}`
        }
        source = typeof leadData.source === 'string' && leadData.source ? leadData.source.toUpperCase() : 'WEBSITE'
        status = typeof leadData.status === 'string' && leadData.status ? leadData.status.toUpperCase() : 'NEW'
        propertyType = typeof leadData.propertyType === 'string' && leadData.propertyType
          ? leadData.propertyType.toUpperCase()
          : null
        budget = leadData.budget === null || leadData.budget === undefined || leadData.budget === ''
          ? null
          : Number(leadData.budget)
        nextFollowupDate = leadData.nextFollowupDate
          ? new Date(leadData.nextFollowupDate)
          : null

        if (!name || !mobile) throw new Error('Name and mobile are required')
        if (name.length > 200 || mobile.length > 40) throw new Error('Name or mobile exceeds the allowed length')
        if (!/^\+[1-9]\d{7,14}$/.test(mobile)) throw new Error('Mobile must be a valid international number; correct this row before importing')
        if (!validSources.includes(source)) throw new Error('Invalid lead source')
        if (!validStatuses.includes(status)) throw new Error('Invalid lead status')
        if (propertyType && !validPropertyTypes.includes(propertyType)) throw new Error('Invalid property type')
        if (budget !== null && (!Number.isFinite(budget) || budget < 0)) throw new Error('Invalid budget')
        if (nextFollowupDate && Number.isNaN(nextFollowupDate.getTime())) throw new Error('Invalid next follow-up date')

        const assignedToName = typeof leadData.assignedToName === 'string' ? leadData.assignedToName.trim() : ''
        const projectName = typeof leadData.projectName === 'string' ? leadData.projectName.trim() : ''
        if (assignedToName) {
          const matches = usersByName.get(assignedToName.replace(/\s+/g, ' ').toLowerCase()) || []
          if (matches.length !== 1) throw new Error('Assigned To must match exactly one active CRM user')
          leadData.assignedToId = matches[0]
        }
        if (projectName) {
          const matches = projectsByName.get(projectName.replace(/\s+/g, ' ').toLowerCase()) || []
          if (matches.length !== 1) throw new Error('Project must match exactly one active CRM project')
          leadData.projectId = matches[0]
        }
      } catch (error) {
        results.errors++
        results.rowErrors.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Invalid lead data',
        })
        continue
      }

      try {
        const duplicate = await prisma.lead.findFirst({ where: { mobile, isActive: true } })
        await prisma.lead.create({
          data: {
            name,
            mobile,
            email: typeof leadData.email === 'string' && leadData.email.trim() ? leadData.email.trim() : null,
            budget,
            city: typeof leadData.city === 'string' && leadData.city.trim() ? leadData.city.trim() : null,
            source: source as LeadSource,
            status: status as LeadStatus,
            propertyType: propertyType as PropertyType | null,
            remarks: typeof leadData.remarks === 'string' && leadData.remarks.trim() ? leadData.remarks.trim() : null,
            nextFollowupDate,
            projectId: typeof leadData.projectId === 'string' && leadData.projectId ? leadData.projectId : null,
            assignedToId: typeof leadData.assignedToId === 'string' && leadData.assignedToId ? leadData.assignedToId : req.user?.id,
            createdById: req.user?.id,
            isDuplicate: !!duplicate,
          },
        })
        duplicate ? results.duplicates++ : results.created++
      } catch {
        results.errors++
        results.rowErrors.push({ row: index + 2, message: 'Could not save lead; verify its values and check for duplicates' })
      }
    }

    res.json({ success: true, message: 'Bulk import completed', data: results })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Bulk import failed', error })
  }
}
