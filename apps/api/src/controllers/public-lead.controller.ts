import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { notifyManagersOfNewLeads } from '../services/notification.service'

const leadCaptureSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phoneNumber: z.string().trim().min(10).max(20),
  emailAddress: z.string().trim().email().max(254),
  website: z.string().optional(),
})

export const normalizeIndianMobile = (value: string) => {
  let digits = value.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null
}

const HARA_PROJECT_NAMES = ['Hara Rassai Vijayam', 'Hara Vijayam'] as const

export const findHaraProject = <T extends { id: string; name: string }>(projects: T[]) =>
  HARA_PROJECT_NAMES
    .map(name => projects.find(project => project.name.trim().toLowerCase() === name.toLowerCase()))
    .find(Boolean)

export const captureWebsiteLead = async (req: Request, res: Response) => {
  const parsed = leadCaptureSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid name, 10-digit Indian mobile number and email address.',
    })
  }

  if (parsed.data.website?.trim()) {
    return res.status(200).json({ success: true, message: 'Thank you! We will get in touch with you shortly.' })
  }

  const mobile = normalizeIndianMobile(parsed.data.phoneNumber)
  if (!mobile) {
    return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number.' })
  }

  try {
    const projects = await prisma.project.findMany({
      where: { name: { in: [...HARA_PROJECT_NAMES], mode: 'insensitive' }, isActive: true },
      select: { id: true, name: true },
    })
    const project = findHaraProject(projects)

    if (!project) {
      console.error('[Public Lead] Hara Rassai Vijayam project is not configured')
      return res.status(503).json({ success: false, message: 'Lead capture is temporarily unavailable.' })
    }

    const duplicate = await prisma.lead.findFirst({
      where: { mobile, isActive: true },
      select: { id: true },
    })

    const lead = await prisma.$transaction(async (transaction) => {
      const createdLead = await transaction.lead.create({
        data: {
          name: parsed.data.fullName,
          mobile,
          email: parsed.data.emailAddress.toLowerCase(),
          source: 'WEBSITE',
          status: 'NEW',
          projectId: project.id,
          isDuplicate: Boolean(duplicate),
          remarks: 'Callback request submitted from www.hararassai.aaroviagroup.com',
        },
        select: { id: true },
      })

      await transaction.activity.create({
        data: {
          leadId: createdLead.id,
          type: 'LEAD_CREATED',
          description: 'Lead captured from Hara Rassai website form',
          metadata: { source: 'WEBSITE', projectId: project.id },
        },
      })

      return createdLead
    })

    await notifyManagersOfNewLeads([{ id: lead.id, name: parsed.data.fullName, mobile, source: 'WEBSITE' }])
    return res.status(201).json({
      success: true,
      message: 'Thank you! We will get in touch with you shortly.',
      data: { id: lead.id },
    })
  } catch (error) {
    console.error('[Public Lead] Failed to capture website lead', error)
    return res.status(500).json({ success: false, message: 'Unable to submit your request. Please try again.' })
  }
}
