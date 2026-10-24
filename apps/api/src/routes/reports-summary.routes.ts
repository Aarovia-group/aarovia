import { Router } from 'express'
import { getReportsSummary } from '../controllers/reports-summary.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'))
router.get('/summary', getReportsSummary)

export default router
