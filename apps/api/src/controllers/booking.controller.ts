import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const generateBookingNumber = () => {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `BK-${year}${month}-${random}`
}

export const getBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', agreementStatus, search, from, to } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const where: any = {}

    if (agreementStatus) where.agreementStatus = agreementStatus
    if (from || to) {
      where.bookingDate = {}
      if (from) where.bookingDate.gte = new Date(from as string)
      if (to) where.bookingDate.lte = new Date(to as string)
    }
    if (search) {
      where.OR = [
        { bookingNumber: { contains: search as string, mode: 'insensitive' } },
        { customer: { name: { contains: search as string, mode: 'insensitive' } } },
        { customer: { mobile: { contains: search as string } } },
      ]
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { bookingDate: 'desc' },
        include: {
          customer: { select: { id: true, name: true, mobile: true, email: true } },
          inventory: { select: { id: true, unitNumber: true, tower: true, floor: true, area: true } },
          lead: { select: { id: true, name: true, source: true } },
          quotation: { select: { id: true, quotationNumber: true, totalAmount: true, gstAmount: true, gstRate: true } },
          _count: { select: { payments: true, invoices: true } },
        },
      }),
      prisma.booking.count({ where }),
    ])

    res.json({
      success: true, data: bookings,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings', error })
  }
}

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true, lead: true,
        inventory: { include: { project: true } },
        quotation: { include: { paymentMilestones: true } },
        invoices: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
        milestones: { orderBy: { dueDate: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        siteVisits: { orderBy: { scheduledAt: 'desc' } },
      },
    })
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' })
    res.json({ success: true, data: booking })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch booking', error })
  }
}

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, customerId, inventoryId, quotationId, totalAmount, bookingAmount, notes } = req.body
    const parsedTotal = Number(totalAmount)
    const parsedBookingAmount = Number(bookingAmount || 0)
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0 || !Number.isFinite(parsedBookingAmount) || parsedBookingAmount < 0 || parsedBookingAmount > parsedTotal) {
      return res.status(400).json({ success: false, message: 'Invalid booking amount or total amount' })
    }

    const booking = await prisma.$transaction(async (tx) => {
      const [lead, customer, inventory] = await Promise.all([
        tx.lead.findUnique({ where: { id: leadId } }),
        tx.customer.findUnique({ where: { id: customerId } }),
        tx.inventory.findUnique({ where: { id: inventoryId } }),
      ])
      if (!lead || !customer || !inventory) throw new Error('Lead, customer, or inventory not found')
      const [existingLeadBooking, existingInventoryBooking] = await Promise.all([
        tx.booking.findUnique({ where: { leadId } }),
        tx.booking.findUnique({ where: { inventoryId } }),
      ])
      if (lead.status === 'BOOKED' || existingLeadBooking) throw new Error('Lead already has a booking')
      if (inventory.status !== 'AVAILABLE' || existingInventoryBooking) throw new Error('Inventory is no longer available')
      if (quotationId) {
        const quotation = await tx.quotation.findUnique({ where: { id: quotationId } })
        if (!quotation || quotation.leadId !== leadId || quotation.inventoryId !== inventoryId) throw new Error('Quotation does not match the selected lead and inventory')
      }
      const created = await tx.booking.create({
        data: { bookingNumber: generateBookingNumber(), leadId, customerId, inventoryId, quotationId, totalAmount: parsedTotal, collectedAmount: parsedBookingAmount, dueAmount: parsedTotal - parsedBookingAmount, notes },
        include: { customer: true, inventory: { include: { project: true } } },
      })
      await tx.lead.update({ where: { id: leadId }, data: { status: 'BOOKED' } })
      await tx.inventory.update({ where: { id: inventoryId }, data: { status: 'SOLD', customerId } })
      if (quotationId) await tx.quotation.update({ where: { id: quotationId }, data: { status: 'CONVERTED' } })
      if (parsedBookingAmount > 0) await tx.payment.create({ data: { bookingId: created.id, customerId, amount: parsedBookingAmount, paymentMode: 'BOOKING', notes: 'Booking amount' } })
      await tx.activity.create({ data: { leadId, userId: req.user?.id, type: 'BOOKING_CREATED', description: `Booking created: ${created.bookingNumber}` } })
      return created
    })

    res.status(201).json({ success: true, message: 'Booking created successfully', data: booking })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create booking', error })
  }
}

export const updateBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { agreementStatus, agreementUrl, notes } = req.body
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { agreementStatus, agreementUrl, notes },
    })
    res.json({ success: true, message: 'Booking updated', data: booking })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update booking', error })
  }
}

export const addPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { amount, paymentMode, transactionId, notes } = req.body

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ success: false, message: 'Payment amount must be positive' })

    const payment = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } })
      if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 })
      if (parsedAmount > booking.dueAmount) throw Object.assign(new Error('Payment cannot exceed the outstanding balance'), { statusCode: 400 })

      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          collectedAmount: { increment: parsedAmount },
          dueAmount: { decrement: parsedAmount },
        },
      })

      return tx.payment.create({
        data: {
          bookingId: id, customerId: updatedBooking.customerId,
          amount: parsedAmount, paymentMode, transactionId, notes,
        },
      })
    })

    res.status(201).json({ success: true, message: 'Payment recorded', data: payment })
  } catch (error) {
    const statusCode = (error as any)?.statusCode
    res.status(statusCode || 500).json({ success: false, message: statusCode ? (error as Error).message : 'Failed to record payment', error })
  }
}
