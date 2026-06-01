import { Request, Response } from 'express'
import prisma from '../utils/prisma'

const generateInvoiceNumber = () => {
  const d = new Date()
  return `INV-${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}-${Math.floor(Math.random()*9000)+1000}`
}

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, bookingId } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const where: any = {}
    if (status) where.status = status
    if (bookingId) where.bookingId = bookingId
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({ where, skip, take: parseInt(limit as string), orderBy: { createdAt: 'desc' },
        include: { booking: { include: { customer: { select: { name: true, mobile: true } } } } } }),
      prisma.invoice.count({ where }),
    ])
    res.json({ success: true, data: invoices, meta: { total } })
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch invoices', error }) }
}

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { bookingId, amount, gstRate = 5, dueDate, notes } = req.body
    const gstAmount = parseFloat(amount) * (parseFloat(gstRate) / 100)
    const totalAmount = parseFloat(amount) + gstAmount
    const invoice = await prisma.invoice.create({
      data: { invoiceNumber: generateInvoiceNumber(), bookingId, amount: parseFloat(amount), gstAmount, totalAmount, dueDate: dueDate ? new Date(dueDate) : null, notes },
    })
    res.status(201).json({ success: true, message: 'Invoice created', data: invoice })
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to create invoice', error }) }
}

export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { status, paidDate } = req.body
    const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data: { status, paidDate: paidDate ? new Date(paidDate) : null } })
    res.json({ success: true, message: 'Invoice updated', data: invoice })
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to update invoice', error }) }
}
