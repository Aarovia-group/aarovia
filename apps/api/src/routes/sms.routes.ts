import { Router } from 'express'
import { sendCustomSms, sendBulkSms } from '../controllers/sms.controller'
import { authenticate, authorize, authorizeModule } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.use(authorizeModule('sms'))
router.post('/send-custom', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM'), sendCustomSms)
router.post('/send-bulk', authorize('SUPER_ADMIN', 'ADMIN'), sendBulkSms)

export default router