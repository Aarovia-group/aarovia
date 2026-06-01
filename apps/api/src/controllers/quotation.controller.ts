import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const generateQuotationNumber = () => {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `QT-${year}${month}-${random}`
}

const calculateQuotation = (data: any) => {
  const baseAmount = data.baseRate * data.area
  const subtotal = baseAmount +
    (data.floorRise || 0) +
    (data.plcCharges || 0) +
    (data.maintenanceCharges || 0) +
    (data.parkingCharges || 0) +
    (data.clubhouseCharges || 0) +
    (data.legalCharges || 0)
  const discountedAmount = subtotal - (data.discount || 0)
  const gstAmount = discountedAmount * ((data.gstRate || 5) / 100)
  const totalAmount = discountedAmount + gstAmount
  return { baseAmount, gstAmount, totalAmount }
}

export const getQuotations = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, leadId, search } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const where: any = {}

    if (status) where.status = status
    if (leadId) where.leadId = leadId as string
    if (search) {
      where.OR = [
        { quotationNumber: { contains: search as string, mode: 'insensitive' } },
        { lead: { name: { contains: search as string, mode: 'insensitive' } } },
      ]
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          lead: { select: { id: true, name: true, mobile: true } },
          project: { select: { id: true, name: true } },
          inventory: { select: { id: true, unitNumber: true, tower: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ])

    res.json({
      success: true, data: quotations,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch quotations', error })
  }
}

export const getQuotationById = async (req: Request, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true, project: true, inventory: true,
        createdBy: { select: { id: true, name: true, email: true } },
        paymentMilestones: { orderBy: { dueDate: 'asc' } },
      },
    })
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' })
    res.json({ success: true, data: quotation })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch quotation', error })
  }
}

export const createQuotation = async (req: AuthRequest, res: Response) => {
  try {
    const { baseRate, area, floorRise, plcCharges, maintenanceCharges, parkingCharges,
      clubhouseCharges, legalCharges, gstRate, discount, bookingAmount, propertyType,
      leadId, inventoryId, projectId, notes, validUntil, paymentMilestones } = req.body

    const { baseAmount, gstAmount, totalAmount } = calculateQuotation({
      baseRate, area, floorRise, plcCharges, maintenanceCharges, parkingCharges,
      clubhouseCharges, legalCharges, gstRate, discount,
    })

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: generateQuotationNumber(),
        propertyType, baseRate: parseFloat(baseRate), area: parseFloat(area),
        baseAmount, floorRise: floorRise || 0, plcCharges: plcCharges || 0,
        maintenanceCharges: maintenanceCharges || 0, parkingCharges: parkingCharges || 0,
        clubhouseCharges: clubhouseCharges || 0, legalCharges: legalCharges || 0,
        gstRate: gstRate || 5, gstAmount, discount: discount || 0, totalAmount,
        bookingAmount: bookingAmount || 0, leadId, inventoryId, projectId,
        createdById: req.user?.id, notes,
        validUntil: validUntil ? new Date(validUntil) : null,
        paymentMilestones: paymentMilestones ? {
          create: paymentMilestones.map((m: any) => ({
            name: m.name, percentage: m.percentage,
            amount: (totalAmount * m.percentage) / 100,
            dueDate: m.dueDate ? new Date(m.dueDate) : null,
          })),
        } : undefined,
      },
      include: { lead: true, project: true, inventory: true, paymentMilestones: true },
    })

    res.status(201).json({ success: true, message: 'Quotation created', data: quotation })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create quotation', error })
  }
}

export const updateQuotation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const data = req.body

    if (data.baseRate || data.area) {
      const existing = await prisma.quotation.findUnique({ where: { id } })
      const merged = { ...existing, ...data }
      const calc = calculateQuotation(merged)
      data.baseAmount = calc.baseAmount
      data.gstAmount = calc.gstAmount
      data.totalAmount = calc.totalAmount
    }

    const quotation = await prisma.quotation.update({ where: { id }, data })
    res.json({ success: true, message: 'Quotation updated', data: quotation })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update quotation', error })
  }
}

export const updateQuotationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const quotation = await prisma.quotation.update({ where: { id }, data: { status } })
    res.json({ success: true, message: 'Status updated', data: quotation })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status', error })
  }
}

export const deleteQuotation = async (req: Request, res: Response) => {
  try {
    await prisma.quotation.delete({ where: { id: req.params.id } })
    res.json({ success: true, message: 'Quotation deleted' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete quotation', error })
  }
}
