import { Request, Response } from 'express'
import prisma from '../utils/prisma'

export const getCollections = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', from, to } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const where: any = {}
    if (from || to) {
      where.paymentDate = {}
      if (from) where.paymentDate.gte = new Date(from as string)
      if (to) where.paymentDate.lte = new Date(to as string)
    }
    const [payments, total, totalSum] = await Promise.all([
      prisma.payment.findMany({ where, skip, take: parseInt(limit as string), orderBy: { paymentDate: 'desc' },
        include: { booking: { include: { customer: { select: { name: true } }, inventory: { select: { unitNumber: true } } } } } }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({ where, _sum: { amount: true } }),
    ])
    res.json({ success: true, data: payments, meta: { total, totalAmount: totalSum._sum.amount || 0 } })
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch collections', error }) }
}

export const getDueCollections = async (req: Request, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { dueAmount: { gt: 0 } },
      include: { customer: { select: { name: true, mobile: true, email: true } }, inventory: { select: { unitNumber: true, tower: true }, } },
      orderBy: { dueAmount: 'desc' },
    })
    res.json({ success: true, data: bookings })
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch due collections', error }) }
}
