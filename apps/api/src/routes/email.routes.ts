import { Router } from 'express'
import { sendProjectDetails, sendBulkEmail, sendQuotationEmail, getEmailLogs } from '../controllers/email.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.post('/send-project-details', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM'), sendProjectDetails)
router.post('/send-bulk', authorize('SUPER_ADMIN', 'ADMIN'), sendBulkEmail)
router.post('/send-quotation', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM'), sendQuotationEmail)
router.get('/logs', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'CRM_TEAM'), getEmailLogs)

export default router
