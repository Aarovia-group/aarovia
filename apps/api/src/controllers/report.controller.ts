import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

    const where: any = {}
    if (req.user?.role === 'SALES_EXECUTIVE') where.assignedToId = req.user.id

    const [
      totalLeads, newLeadsToday, followupsDue, siteVisitsThisMonth,
      bookingsThisMonth, totalBookings, collectionsThisMonth, dueAmount,
      inventoryAvailable, inventorySold, leadsLastMonth, bookingsLastMonth,
    ] = await Promise.all([
      prisma.lead.count({ where: { ...where, isActive: true } }),
      prisma.lead.count({ where: { ...where, isActive: true, createdAt: { gte: new Date(today.toDateString()) } } }),
      prisma.lead.count({ where: { ...where, isActive: true, nextFollowupDate: { lte: today } } }),
      prisma.siteVisit.count({ where: { scheduledAt: { gte: startOfMonth } } }),
      prisma.booking.count({ where: { bookingDate: { gte: startOfMonth } } }),
      prisma.booking.count({}),
      prisma.payment.aggregate({ where: { paymentDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.booking.aggregate({ _sum: { dueAmount: true } }),
      prisma.inventory.count({ where: { status: 'AVAILABLE' } }),
      prisma.inventory.count({ where: { status: 'SOLD' } }),
      prisma.lead.count({ where: { ...where, isActive: true, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.booking.count({ where: { bookingDate: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    ])

    res.json({
      success: true,
      data: {
        totalLeads,
        newLeadsToday,
        followupsDue,
        siteVisitsThisMonth,
        bookingsThisMonth,
        totalBookings,
        collectionsThisMonth: collectionsThisMonth._sum.amount || 0,
        dueAmount: dueAmount._sum.dueAmount || 0,
        inventoryAvailable,
        inventorySold,
        leadGrowth: totalLeads > 0 ? (((totalLeads - leadsLastMonth) / leadsLastMonth) * 100).toFixed(1) : 0,
        bookingGrowth: bookingsLastMonth > 0 ? (((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth) * 100).toFixed(1) : 0,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error })
  }
}

export const getMonthlyRevenue = async (req: Request, res: Response) => {
  try {
    const months = parseInt(req.query.months as string) || 6
    const data = []

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date()
      const start = new Date(date.getFullYear(), date.getMonth() - i, 1)
      const end = new Date(date.getFullYear(), date.getMonth() - i + 1, 0)

      const result = await prisma.payment.aggregate({
        where: { paymentDate: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      })

      data.push({
        month: start.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        revenue: result._sum.amount || 0,
        transactions: result._count,
      })
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch revenue', error })
  }
}

export const getLeadSourceAnalytics = async (req: Request, res: Response) => {
  try {
    const result = await prisma.lead.groupBy({
      by: ['source'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    const total = result.reduce((sum, r) => sum + r._count.id, 0)
    const data = result.map(r => ({
      source: r.source,
      count: r._count.id,
      percentage: total > 0 ? ((r._count.id / total) * 100).toFixed(1) : '0',
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch source analytics', error })
  }
}

export const getTeamPerformance = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query
    const startDate = from ? new Date(from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const endDate = to ? new Date(to as string) : new Date()

    const executives = await prisma.user.findMany({
      where: { role: { in: ['SALES_EXECUTIVE', 'TELECALLER', 'CRM_TEAM'] }, isActive: true },
      select: { id: true, name: true, role: true, avatar: true },
    })

    const performance = await Promise.all(
      executives.map(async (exec) => {
        const [leads, bookings, callLogs, siteVisits] = await Promise.all([
          prisma.lead.count({ where: { assignedToId: exec.id, createdAt: { gte: startDate, lte: endDate } } }),
          prisma.booking.count({ where: { lead: { assignedToId: exec.id }, bookingDate: { gte: startDate, lte: endDate } } }),
          prisma.callLog.count({ where: { userId: exec.id, calledAt: { gte: startDate, lte: endDate } } }),
          prisma.siteVisit.count({ where: { lead: { assignedToId: exec.id }, scheduledAt: { gte: startDate, lte: endDate } } }),
        ])
        const conversionRate = leads > 0 ? ((bookings / leads) * 100).toFixed(1) : '0'
        return { ...exec, leads, bookings, callLogs, siteVisits, conversionRate }
      })
    )

    res.json({ success: true, data: performance.sort((a, b) => b.bookings - a.bookings) })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch team performance', error })
  }
}

export const getLeadStatusReport = async (req: Request, res: Response) => {
  try {
    const result = await prisma.lead.groupBy({
      by: ['status'],
      where: { isActive: true },
      _count: { id: true },
    })
    const total = result.reduce((sum, r) => sum + r._count.id, 0)
    const data = result.map(r => ({
      status: r.status, count: r._count.id,
      percentage: total > 0 ? ((r._count.id / total) * 100).toFixed(1) : '0',
    }))
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch report', error })
  }
}

export const getCollectionReport = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query
    const where: any = {}
    if (from) where.paymentDate = { gte: new Date(from as string) }
    if (to) where.paymentDate = { ...where.paymentDate, lte: new Date(to as string) }

    const [payments, overdueBookings] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { booking: { include: { customer: { select: { name: true } }, inventory: { select: { unitNumber: true } } } } },
        orderBy: { paymentDate: 'desc' },
        take: 100,
      }),
      prisma.booking.findMany({
        where: { dueAmount: { gt: 0 } },
        include: { customer: { select: { name: true, mobile: true } }, inventory: { select: { unitNumber: true } } },
        orderBy: { dueAmount: 'desc' },
      }),
    ])

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalDue = overdueBookings.reduce((sum, b) => sum + b.dueAmount, 0)

    res.json({ success: true, data: { payments, overdueBookings, totalCollected, totalDue } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch collection report', error })
  }
}

export const getInventoryReport = async (req: Request, res: Response) => {
  try {
    const [byStatus, byProject, byType] = await Promise.all([
      prisma.inventory.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.inventory.groupBy({ by: ['projectId', 'status'], _count: { id: true } }),
      prisma.inventory.groupBy({ by: ['propertyType', 'status'], _count: { id: true } }),
    ])
    res.json({ success: true, data: { byStatus, byProject, byType } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch inventory report', error })
  }
}
