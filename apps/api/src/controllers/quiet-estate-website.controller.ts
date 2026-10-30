import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { notifyManagersOfNewLeads } from '../services/notification.service'
import { normalizeIndianMobile } from './public-lead.controller'

export const quietEstateLeadCaptureSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(120, 'Name is too long.'),
  phone: z.string().trim().min(10).max(20),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  source: z.literal('landing-hero'),
  submitted_at: z.string().datetime(),
})

export const findQuietEstateProject = <T extends { id: string; name: string }>(projects: T[]) =>
  projects.find(project =>
    project.name
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')
      .replace(/[^a-z0-9]+/gi, ' ')
      .trim()
      .toLowerCase() === 'quest estate',
  )

export const captureQuietEstateWebsiteLead = async (req: Request, res: Response) => {
  const parsed = quietEstateLeadCaptureSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Please check the submitted form fields.',
    })
  }

  const mobile = normalizeIndianMobile(parsed.data.phone)
  if (!mobile) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid 10-digit Indian phone number.',
    })
  }

  try {
    const projects = await prisma.project.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })
    const project = findQuietEstateProject(projects)

    if (!project) {
      console.error('[Quiet Estate Website Lead] Active Quest Estate project was not found')
      return res.status(503).json({
        success: false,
        message: 'Lead submission is temporarily unavailable. Please try again later.',
      })
    }

    const duplicate = await prisma.lead.findFirst({
      where: { mobile, isActive: true },
      select: { id: true },
    })

    const lead = await prisma.$transaction(async transaction => {
      const createdLead = await transaction.lead.create({
        data: {
          name: parsed.data.name,
          mobile,
          email: parsed.data.email.toLowerCase(),
          source: 'WEBSITE',
          status: 'NEW',
          projectId: project.id,
          isDuplicate: Boolean(duplicate),
          remarks: 'Website lead submitted from quietestate.aaroviagroup.com (landing-hero form)',
        },
        select: { id: true, name: true, mobile: true, source: true },
      })

      await transaction.activity.create({
        data: {
          leadId: createdLead.id,
          type: 'LEAD_CREATED',
          description: 'Lead captured from Quiet Estate website form',
          metadata: { source: 'WEBSITE', projectId: project.id, formType: parsed.data.source },
        },
      })

      return createdLead
    })

    await notifyManagersOfNewLeads([
      { id: lead.id, name: lead.name, mobile: lead.mobile, source: lead.source },
    ])

    return res.status(201).json({ success: true })
  } catch (error) {
    console.error(
      '[Quiet Estate Website Lead] Failed to create lead',
      error instanceof Error ? error.name : 'unknown error',
    )
    return res.status(500).json({
      success: false,
      message: 'Unable to submit your request. Please try again.',
    })
  }
}
