import { Router } from 'express'
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getNotifications)
router.patch('/:id/read', markAsRead)
router.patch('/mark-all-read', markAllAsRead)
export default router
