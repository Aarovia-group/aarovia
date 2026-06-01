import { Router } from 'express'
import { getLeads, getLeadById, createLead, updateLead, deleteLead, updateLeadStatus, assignLead, addCallLog, addNote, getPipelineLeads, bulkImportLeads } from '../controllers/lead.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', getLeads)
router.get('/pipeline', getPipelineLeads)
router.post('/bulk-import', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'), bulkImportLeads)
router.post('/', createLead)
router.get('/:id', getLeadById)
router.put('/:id', updateLead)
router.delete('/:id', authorize('SUPER_ADMIN', 'ADMIN'), deleteLead)
router.patch('/:id/status', updateLeadStatus)
router.patch('/:id/assign', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'), assignLead)
router.post('/:id/call-log', addCallLog)
router.post('/:id/note', addNote)

export default router
