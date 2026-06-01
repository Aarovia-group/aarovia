import { Router } from 'express'
import { sendProjectDetailsWA, sendFollowupWA, sendPaymentReminderWA, getWhatsAppLogs } from '../controllers/whatsapp.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.post('/send-project-details', sendProjectDetailsWA)
router.post('/send-followup', sendFollowupWA)
router.post('/send-payment-reminder', sendPaymentReminderWA)
router.get('/logs', getWhatsAppLogs)

export default router
