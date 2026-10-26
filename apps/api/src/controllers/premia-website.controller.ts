import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { notifyManagersOfNewLeads } from '../services/notification.service'
import { normalizeIndianMobile } from './public-lead.controller'

export const premiaLeadCaptureSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120, 'Name is too long.'),
  phoneNumber: z.string().trim().min(10).max(20),
  emailAddress: z.union([
    z.string().trim().email('Enter a valid email address.').max(254, 'Email address is too long.'),
    z.literal(''),
  ]).optional(),
  formType: z.enum(['hero', 'enquiry']),
  website: z.string().optional(),
})

const PREMIA_PROJECT_NAMES = ['Primia', 'Premia'] as const

export const findPremiaProject = <T extends { id: string; name: string }>(projects: T[]) =>
  PREMIA_PROJECT_NAMES
    .map(name => projects.find(project => project.name.trim().toLowerCase() === name.toLowerCase()))
    .find(Boolean)

export const capturePremiaWebsiteLead = async (req: Request, res: Response) => {
  if (typeof req.body?.website === 'string' && req.body.website.trim()) {
    return res.status(200).json({ success: true })
  }

  const parsed = premiaLeadCaptureSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Please check the submitted form fields.',
    })
  }

  const mobile = normalizeIndianMobile(parsed.data.phoneNumber)
  if (!mobile) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid 10-digit Indian phone number.',
    })
  }

  try {
    const projects = await prisma.project.findMany({
      where: { name: { in: [...PREMIA_PROJECT_NAMES], mode: 'insensitive' }, isActive: true },
      select: { id: true, name: true },
    })
    const project = findPremiaProject(projects)

    if (!project) {
      console.error('[Premia Website Lead] Premia project was not found')
      return res.status(503).json({
        success: false,
        message: 'Lead submission is temporarily unavailable. Please try again later.',
      })
    }

    const duplicate = await prisma.lead.findFirst({
      where: { mobile, isActive: true },
      select: { id: true },
    })
    const email = parsed.data.emailAddress?.trim()

    const lead = await prisma.$transaction(async transaction => {
      const createdLead = await transaction.lead.create({
        data: {
          name: parsed.data.fullName,
          mobile,
          email: email ? email.toLowerCase() : null,
          source: 'WEBSITE',
          status: 'NEW',
          projectId: project.id,
          isDuplicate: Boolean(duplicate),
          remarks: `Website lead submitted from premia.aaroviagroup.com (${parsed.data.formType} form)`,
        },
        select: { id: true, name: true, mobile: true, source: true },
      })

      await transaction.activity.create({
        data: {
          leadId: createdLead.id,
          type: 'LEAD_CREATED',
          description: 'Lead captured from Premia website form',
          metadata: { source: 'WEBSITE', projectId: project.id, formType: parsed.data.formType },
        },
      })

      return createdLead
    })

    await notifyManagersOfNewLeads([
      { id: lead.id, name: lead.name, mobile: lead.mobile, source: lead.source },
    ])

    return res.status(201).json({ success: true })
  } catch (error) {
    console.error('[Premia Website Lead] Failed to create lead', error instanceof Error ? error.name : 'unknown error')
    return res.status(500).json({
      success: false,
      message: 'Unable to submit your request. Please try again.',
    })
  }
}
