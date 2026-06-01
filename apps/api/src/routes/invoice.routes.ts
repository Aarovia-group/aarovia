import { Router } from 'express'
import { getInvoices, createInvoice, updateInvoiceStatus } from '../controllers/invoice.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', getInvoices)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'), createInvoice)
router.patch('/:id/status', authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'), updateInvoiceStatus)

export default router
