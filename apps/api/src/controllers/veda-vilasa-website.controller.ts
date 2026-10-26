import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { notifyManagersOfNewLeads } from '../services/notification.service'
import { normalizeIndianMobile } from './public-lead.controller'

export const vedaVilasaLeadCaptureSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120, 'Name is too long.'),
  phoneNumber: z.string().trim().min(10).max(20),
  emailAddress: z.string().trim().email('Enter a valid email address.').max(254),
  formType: z.enum(['landing', 'modal']),
  consent: z.literal(true),
  website: z.string().optional(),
})

export const findVedaVilasaProject = <T extends { id: string; name: string }>(projects: T[]) =>
  projects.find(project => project.name.trim().toLowerCase() === 'veda vilasa')

export const captureVedaVilasaWebsiteLead = async (req: Request, res: Response) => {
  if (typeof req.body?.website === 'string' && req.body.website.trim()) {
    return res.status(200).json({ success: true })
  }

  const parsed = vedaVilasaLeadCaptureSchema.safeParse(req.body)
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
      where: { name: { equals: 'Veda Vilasa', mode: 'insensitive' }, isActive: true },
      select: { id: true, name: true },
    })
    const project = findVedaVilasaProject(projects)

    if (!project) {
      console.error('[Veda Vilasa Website Lead] Active Veda Vilasa project was not found')
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
          name: parsed.data.fullName,
          mobile,
          email: parsed.data.emailAddress.toLowerCase(),
          source: 'WEBSITE',
          status: 'NEW',
          projectId: project.id,
          isDuplicate: Boolean(duplicate),
          remarks: `Website lead submitted from vedavilasa.aaroviagroup.com (${parsed.data.formType} form)`,
        },
        select: { id: true, name: true, mobile: true, source: true },
      })

      await transaction.activity.create({
        data: {
          leadId: createdLead.id,
          type: 'LEAD_CREATED',
          description: 'Lead captured from Veda Vilasa website form',
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
    console.error('[Veda Vilasa Website Lead] Failed to create lead', error instanceof Error ? error.name : 'unknown error')
    return res.status(500).json({
      success: false,
      message: 'Unable to submit your request. Please try again.',
    })
  }
}
