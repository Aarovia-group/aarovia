import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { generateInvoiceHTML } from '../services/pdf.service'

const invoiceRelations = {
  booking: {
    include: {
      customer: true,
      lead: { include: { assignedTo: { select: { name: true, email: true, phone: true } } } },
      inventory: { include: { project: true } },
      quotation: { include: { project: true } },
    },
  },
}

const generateInvoiceNumber = () => {
  const d = new Date()
  return `INV-${d.getFullYear().toString().slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000) + 1000}`
}

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, bookingId, search } = req.query
    const parsedPage = Math.max(1, Number.parseInt(page as string, 10) || 1)
    const parsedLimit = Math.min(100, Math.max(1, Number.parseInt(limit as string, 10) || 20))
    const skip = (parsedPage - 1) * parsedLimit
    const where: any = {}
    if (status) where.status = status
    if (bookingId) where.bookingId = bookingId
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
        { booking: { bookingNumber: { contains: search as string, mode: 'insensitive' } } },
        { booking: { customer: { name: { contains: search as string, mode: 'insensitive' } } } },
      ]
    }
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({ where, skip, take: parsedLimit, orderBy: { createdAt: 'desc' }, include: invoiceRelations }),
      prisma.invoice.count({ where }),
    ])
    res.json({ success: true, data: invoices, meta: { total, page: parsedPage, limit: parsedLimit, totalPages: Math.ceil(total / parsedLimit) } })
  } catch (error) {
    console.error('[Invoices] Fetch failed', error)
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' })
  }
}

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { bookingId, amount, gstRate = 5, dueDate, notes } = req.body
    const parsedAmount = Number(amount)
    const parsedGstRate = Number(gstRate)
    const parsedDueDate = dueDate ? new Date(dueDate) : null
    if (typeof bookingId !== 'string' || !bookingId || !Number.isFinite(parsedAmount) || parsedAmount <= 0
      || !Number.isFinite(parsedGstRate) || parsedGstRate < 0 || parsedGstRate > 100
      || (parsedDueDate && Number.isNaN(parsedDueDate.getTime()))) {
      return res.status(400).json({ success: false, message: 'Enter a booking, a positive amount, a valid GST rate, and a valid due date' })
    }
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true } })
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' })

    const gstAmount = Math.round(parsedAmount * (parsedGstRate / 100) * 100) / 100
    const totalAmount = parsedAmount + gstAmount
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        bookingId,
        amount: parsedAmount,
        gstRate: parsedGstRate,
        gstAmount,
        totalAmount,
        dueDate: parsedDueDate,
        notes: typeof notes === 'string' ? notes.trim() || null : null,
      },
    })
    res.status(201).json({ success: true, message: 'Invoice created', data: invoice })
  } catch (error) {
    console.error('[Invoices] Create failed', error)
    res.status(500).json({ success: false, message: 'Failed to create invoice' })
  }
}

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { amount, gstRate, dueDate, notes } = req.body
    const parsedAmount = Number(amount)
    const parsedGstRate = Number(gstRate)
    const parsedDueDate = dueDate ? new Date(dueDate) : null
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !Number.isFinite(parsedGstRate)
      || parsedGstRate < 0 || parsedGstRate > 100 || (parsedDueDate && Number.isNaN(parsedDueDate.getTime()))) {
      return res.status(400).json({ success: false, message: 'Enter a positive amount, a valid GST rate, and a valid due date' })
    }

    const existing = await prisma.invoice.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } })
    if (!existing) return res.status(404).json({ success: false, message: 'Invoice not found' })
    if (existing.status === 'PAID' || existing.status === 'PARTIAL_PAID') {
      return res.status(409).json({ success: false, message: 'Paid invoices cannot be edited' })
    }

    const gstAmount = Math.round(parsedAmount * (parsedGstRate / 100) * 100) / 100
    const invoice = await prisma.invoice.update({
      where: { id: existing.id },
      data: {
        amount: parsedAmount,
        gstRate: parsedGstRate,
        gstAmount,
        totalAmount: parsedAmount + gstAmount,
        dueDate: parsedDueDate,
        notes: typeof notes === 'string' ? notes.trim() || null : null,
      },
      include: invoiceRelations,
    })
    res.json({ success: true, message: 'Invoice updated', data: invoice })
  } catch (error) {
    console.error('[Invoices] Update failed', error)
    res.status(500).json({ success: false, message: 'Failed to update invoice' })
  }
}

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } })
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' })
    if (invoice.status === 'PAID' || invoice.status === 'PARTIAL_PAID') {
      return res.status(409).json({ success: false, message: 'Paid invoices cannot be deleted' })
    }
    await prisma.invoice.delete({ where: { id: invoice.id } })
    res.json({ success: true, message: 'Invoice deleted' })
  } catch (error) {
    console.error('[Invoices] Delete failed', error)
    res.status(500).json({ success: false, message: 'Failed to delete invoice' })
  }
}

export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { status, paidDate } = req.body
    const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data: { status, paidDate: paidDate ? new Date(paidDate) : null } })
    res.json({ success: true, message: 'Invoice updated', data: invoice })
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to update invoice', error }) }
}

export const getInvoiceDocument = async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: invoiceRelations,
    })
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' })
    res.type('html').send(generateInvoiceHTML(invoice, invoice.booking, req.query.print === '1'))
  } catch (error) {
    console.error('[Invoices] Document generation failed', error)
    res.status(500).json({ success: false, message: 'Failed to generate invoice document' })
  }
}
