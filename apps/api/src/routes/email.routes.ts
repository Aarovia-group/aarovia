import { Router } from 'express'
import { sendProjectDetails, sendQuotationEmail, getEmailLogs } from '../controllers/email.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.post('/send-project-details', sendProjectDetails)
router.post('/send-quotation', sendQuotationEmail)
router.get('/logs', getEmailLogs)

export default router
