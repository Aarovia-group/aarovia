import { Router } from 'express'
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller'
import { authenticate, authorizeModule } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.use(authorizeModule('notifications'))
router.get('/', getNotifications)
router.patch('/mark-all-read', markAllAsRead)
router.patch('/:id/read', markAsRead)
export default router
