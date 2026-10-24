import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { notifyManagersOfNewLeads } from '../services/notification.service'

const leadCaptureSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120, 'Name is too long.'),
  phoneNumber: z.string().trim().refine(
    value => /^\d{10}$/.test(value.replace(/\s/g, '').replace(/^\+91/, '')),
    'Enter a valid 10-digit phone number, optionally prefixed with +91.',
  ),
  emailAddress: z.union([
    z.string().trim().email('Enter a valid email address.').max(254, 'Email address is too long.'),
    z.literal(''),
  ]).optional(),
  villaPreference: z.string().trim().max(120, 'Villa preference is too long.').optional(),
  formType: z.enum(['hero', 'enquiry'], { invalid_type_error: 'Form type must be hero or enquiry.' }),
  project: z.string().trim().min(1).max(120).default('Lake Estate').refine(
    value => value.trim().toLowerCase() === 'lake estate',
    'Project must be Lake Estate.',
  ),
  website: z.string().optional(),
})

export const captureLakeEstateWebsiteLead = async (req: Request, res: Response) => {
  if (typeof req.body?.website === 'string' && req.body.website.trim()) {
    return res.status(200).json({ success: true })
  }

  const parsed = leadCaptureSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Please check the submitted form fields.',
    })
  }

  const mobile = `+91${parsed.data.phoneNumber.replace(/\s/g, '').replace(/^\+91/, '')}`
  const email = parsed.data.emailAddress?.trim()

  try {
    const lakeProjects = await prisma.project.findMany({
      where: { name: { contains: 'lake', mode: 'insensitive' } },
      select: { id: true, name: true },
    })
    const project = lakeProjects.find(
      item => item.name.trim().toLowerCase() === parsed.data.project.trim().toLowerCase(),
    )

    if (!project) {
      console.error('[Lake Estate Website Lead] Lake Estate project was not found')
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
          email: email ? email.toLowerCase() : null,
          source: 'WEBSITE',
          status: 'NEW',
          projectId: project.id,
          isDuplicate: Boolean(duplicate),
          remarks: [
            'Website lead',
            `Form: ${parsed.data.formType}`,
            parsed.data.villaPreference ? `Villa preference: ${parsed.data.villaPreference}` : '',
          ].filter(Boolean).join('; '),
        },
        select: { id: true, name: true, mobile: true, source: true },
      })

      await transaction.activity.create({
        data: {
          leadId: createdLead.id,
          type: 'LEAD_CREATED',
          description: 'Lead created by Lake Estate website form',
        },
      })

      return createdLead
    })

    await notifyManagersOfNewLeads([
      { id: lead.id, name: lead.name, mobile: lead.mobile, source: lead.source },
    ])

    return res.status(201).json({ success: true })
  } catch (error) {
    console.error('[Lake Estate Website Lead] Failed to create lead', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to submit your request. Please try again.',
    })
  }
}
