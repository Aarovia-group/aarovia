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
          quotation: { select: { id: true, quotationNumber: true, totalAmount: true } },
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

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: generateBookingNumber(),
        leadId, customerId, inventoryId, quotationId,
        totalAmount: parseFloat(totalAmount),
        collectedAmount: bookingAmount ? parseFloat(bookingAmount) : 0,
        dueAmount: parseFloat(totalAmount) - (bookingAmount ? parseFloat(bookingAmount) : 0),
        notes,
      },
      include: { customer: true, inventory: { include: { project: true } } },
    })

    // Update lead status to BOOKED
    await prisma.lead.update({ where: { id: leadId }, data: { status: 'BOOKED' } })

    // Block inventory
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { status: 'SOLD', customerId },
    })

    // Add initial payment if booking amount provided
    if (bookingAmount && parseFloat(bookingAmount) > 0) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id, customerId,
          amount: parseFloat(bookingAmount),
          paymentMode: 'BOOKING',
          notes: 'Booking amount',
        },
      })
    }

    await prisma.activity.create({
      data: {
        leadId, userId: req.user?.id,
        type: 'BOOKING_CREATED',
        description: `Booking created: ${booking.bookingNumber}`,
      },
    })

    res.status(201).json({ success: true, message: 'Booking created successfully', data: booking })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create booking', error })
  }
}

export const updateBooking = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: req.body,
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

    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' })

    const payment = await prisma.payment.create({
      data: {
        bookingId: id, customerId: booking.customerId,
        amount: parseFloat(amount), paymentMode, transactionId, notes,
      },
    })

    const newCollected = booking.collectedAmount + parseFloat(amount)
    await prisma.booking.update({
      where: { id },
      data: {
        collectedAmount: newCollected,
        dueAmount: booking.totalAmount - newCollected,
      },
    })

    res.status(201).json({ success: true, message: 'Payment recorded', data: payment })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record payment', error })
  }
}
