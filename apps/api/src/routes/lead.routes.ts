import { Router } from 'express'
import { getLeads, getLeadById, createLead, updateLead, deleteLead, activateLead, updateLeadStatus, assignLead, bulkAssignLeads, bulkAssignProject, addCallLog, updateCallLog, deleteCallLog, deleteCallLogs, addNote, scheduleSiteVisit, getPipelineLeads, bulkImportLeads } from '../controllers/lead.controller'
import { authenticate, authorize, authorizeModule } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { createLeadSchema } from '../validations/schemas'

const router = Router()
router.use(authenticate)
router.use(authorizeModule('leads'))

router.get('/', getLeads)
router.get('/pipeline', getPipelineLeads)
router.post('/bulk-import', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'), bulkImportLeads)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'CRM_TEAM'), validate(createLeadSchema), createLead)
router.get('/:id', getLeadById)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'CRM_TEAM'), validate(createLeadSchema.partial()), updateLead)
router.delete('/:id', authorize('SUPER_ADMIN', 'ADMIN'), deleteLead)
router.patch('/:id/activate', authorize('SUPER_ADMIN', 'ADMIN'), activateLead)
router.patch('/:id/status', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'CRM_TEAM'), updateLeadStatus)
router.patch('/:id/assign', authorize('SUPER_ADMIN', 'ADMIN'), assignLead)
router.patch('/bulk-assign', authorize('SUPER_ADMIN', 'ADMIN'), bulkAssignLeads)
router.patch('/bulk-assign-project', authorize('SUPER_ADMIN', 'ADMIN'), bulkAssignProject)
router.post('/:id/call-log', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'CRM_TEAM'), addCallLog)
router.patch('/:id/call-log/:callId', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'CRM_TEAM'), updateCallLog)
router.delete('/:id/call-logs', authorize('SUPER_ADMIN', 'ADMIN'), deleteCallLogs)
router.delete('/:id/call-log/:callId', authorize('SUPER_ADMIN', 'ADMIN'), deleteCallLog)
router.post('/:id/note', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'CRM_TEAM'), addNote)
router.post('/:id/site-visit', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM', 'POST_SALES'), scheduleSiteVisit)

export default router
