import { Router } from 'express'
import { getDashboardStats, getMonthlyRevenue, getLeadSourceAnalytics, getTeamPerformance, getLeadStatusReport, getCollectionReport, getInventoryReport } from '../controllers/report.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/dashboard', getDashboardStats)
router.get('/monthly-revenue', getMonthlyRevenue)
router.get('/lead-sources', getLeadSourceAnalytics)
router.get('/team-performance', getTeamPerformance)
router.get('/lead-status', getLeadStatusReport)
router.get('/collections', getCollectionReport)
router.get('/inventory', getInventoryReport)

export default router
