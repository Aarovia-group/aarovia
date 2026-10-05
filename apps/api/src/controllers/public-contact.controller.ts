import { Request, Response } from 'express'
import prisma from '../utils/prisma'

const normalizeMobile = (value: string) => {
  const digits = value.replace(/\D/g, '')
  return value.trim().startsWith('+') ? `+${digits}` : digits.length === 10 ? `+91${digits}` : `+${digits}`
}

export const submitPublicContact = async (req: Request, res: Response) => {
  try {
    const name = String(req.body?.name || req.body?.fullName || '').trim()
    const mobile = normalizeMobile(String(req.body?.mobile || req.body?.phone || req.body?.phoneNumber || ''))
    const email = String(req.body?.email || req.body?.emailAddress || '').trim().toLowerCase()
    const message = String(req.body?.message || req.body?.requirements || req.body?.propertyRequirement || req.body?.remarks || '').trim()
    const propertyType = String(req.body?.propertyType || req.body?.interestedIn || '').trim()
    const formType = String(req.body?.formType || req.body?.type || 'contact').trim()

    if (name.length < 2) return res.status(400).json({ success: false, message: 'Name is required' })
    if (!/^\+[1-9]\d{7,14}$/.test(mobile)) return res.status(400).json({ success: false, message: 'Valid phone number is required' })
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: 'Valid email address is required' })

    const existingLead = await prisma.lead.findFirst({ where: { mobile, isActive: true } })
    const lead = await prisma.lead.create({
      data: {
        name,
        mobile,
        email: email || null,
        source: 'WEBSITE',
        propertyType: ['VILLA', 'APARTMENT', 'PLOT', 'FARMLAND', 'COMMERCIAL'].includes(propertyType.toUpperCase()) ? propertyType.toUpperCase() as any : null,
        remarks: message || `${formType} submission from public website`,
        tags: ['PUBLIC_CONTACT', formType.toUpperCase()],
        isDuplicate: !!existingLead,
      },
    })

    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: 'PUBLIC_CONTACT_SUBMITTED',
        description: `${formType} form submitted from public website${existingLead ? ' (duplicate phone number)' : ''}`,
        metadata: { email: email || null, propertyType: propertyType || null, message: message || null },
      },
    })

    return res.status(201).json({ success: true, message: 'Enquiry received', data: { id: lead.id } })
  } catch (error) {
    console.error('[Public Contact] Submission failed', error)
    return res.status(500).json({ success: false, message: 'Unable to submit enquiry' })
  }
}