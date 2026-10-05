import { Router } from 'express'
import { sendCustomSms, sendBulkSms } from '../controllers/sms.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.post('/send-custom', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM'), sendCustomSms)
router.post('/send-bulk', authorize('SUPER_ADMIN', 'ADMIN'), sendBulkSms)

export default router