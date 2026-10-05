import { Router } from 'express'
import { getDashboardStats, getMonthlyRevenue, getLeadSourceAnalytics, getTeamPerformance, getLeadStatusReport, getCollectionReport, getInventoryReport } from '../controllers/report.controller'
import { authenticate, authorizeModule } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/dashboard', authorizeModule('dashboard'), getDashboardStats)
router.get('/monthly-revenue', authorizeModule('reports'), getMonthlyRevenue)
router.get('/lead-sources', authorizeModule('reports'), getLeadSourceAnalytics)
router.get('/team-performance', authorizeModule('reports'), getTeamPerformance)
router.get('/lead-status', authorizeModule('reports'), getLeadStatusReport)
router.get('/collections', authorizeModule('reports'), getCollectionReport)
router.get('/inventory', authorizeModule('reports'), getInventoryReport)

export default router
