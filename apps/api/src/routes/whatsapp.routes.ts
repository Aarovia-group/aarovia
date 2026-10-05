import { Router } from 'express'
import { sendProjectDetailsWA, sendFollowupWA, sendPaymentReminderWA, sendCustomWA, sendBulkWA, getWhatsAppLogs } from '../controllers/whatsapp.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.post('/send-project-details', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM'), sendProjectDetailsWA)
router.post('/send-custom', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM'), sendCustomWA)
router.post('/send-bulk', authorize('SUPER_ADMIN', 'ADMIN'), sendBulkWA)
router.post('/send-followup', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM'), sendFollowupWA)
router.post('/send-payment-reminder', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'CRM_TEAM', 'ACCOUNTS'), sendPaymentReminderWA)
router.get('/logs', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'CRM_TEAM'), getWhatsAppLogs)

export default router
