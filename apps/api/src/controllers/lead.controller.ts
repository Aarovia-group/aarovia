import { Request, Response } from 'express'
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
        whatsappLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
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

export const updateLeadStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, remarks } = req.body

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

    const user = await prisma.user.findUnique({ where: { id: assignedToId }, select: { name: true } })
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

export const addCallLog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { duration, outcome, notes } = req.body

    const callLog = await prisma.callLog.create({
      data: { leadId: id, userId: req.user!.id, duration, outcome, notes },
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

export const addNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { content } = req.body

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
    const { leads } = req.body
    const results = { created: 0, duplicates: 0, errors: 0 }

    for (const leadData of leads) {
      try {
        const duplicate = await prisma.lead.findFirst({ where: { mobile: leadData.mobile, isActive: true } })
        await prisma.lead.create({
          data: {
            ...leadData,
            budget: leadData.budget ? parseFloat(leadData.budget) : null,
            assignedToId: req.user?.id,
            createdById: req.user?.id,
            isDuplicate: !!duplicate,
          },
        })
        duplicate ? results.duplicates++ : results.created++
      } catch {
        results.errors++
      }
    }

    res.json({ success: true, message: 'Bulk import completed', data: results })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Bulk import failed', error })
  }
}
