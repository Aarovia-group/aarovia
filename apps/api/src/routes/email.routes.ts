import { Router } from 'express'
import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplates,
  getEmailLogs,
  sendProjectDetails,
  sendBulkEmail,
  sendQuotationEmail,
  updateEmailTemplate,
} from '../controllers/email.controller'
import { authenticate, authorize, authorizeModule } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.use(authorizeModule('email'))

router.get('/templates', getEmailTemplates)
router.post('/templates', authorize('SUPER_ADMIN', 'ADMIN'), createEmailTemplate)
router.put('/templates/:id', authorize('SUPER_ADMIN', 'ADMIN'), updateEmailTemplate)
router.delete('/templates/:id', authorize('SUPER_ADMIN', 'ADMIN'), deleteEmailTemplate)
router.post('/send-project-details', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM'), sendProjectDetails)
router.post('/send-bulk', authorize('SUPER_ADMIN', 'ADMIN'), sendBulkEmail)
router.post('/send-quotation', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM'), sendQuotationEmail)
router.get('/logs', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'CRM_TEAM'), getEmailLogs)

export default router
