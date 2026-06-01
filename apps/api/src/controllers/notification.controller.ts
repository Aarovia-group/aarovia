import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', isRead } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const where: any = { userId: req.user!.id }
    if (isRead !== undefined) where.isRead = isRead === 'true'
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, skip, take: parseInt(limit as string), orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ])
    res.json({ success: true, data: notifications, meta: { total, unreadCount } })
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch notifications', error }) }
}

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await prisma.notification.update({ where: { id }, data: { isRead: true } })
    res.json({ success: true, message: 'Marked as read' })
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to mark as read', error }) }
}

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } })
    res.json({ success: true, message: 'All notifications marked as read' })
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to mark all as read', error }) }
}
