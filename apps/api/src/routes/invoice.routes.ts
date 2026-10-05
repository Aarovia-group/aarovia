import { Router } from 'express'
import { getInvoices, createInvoice, updateInvoice, deleteInvoice, updateInvoiceStatus, getInvoiceDocument } from '../controllers/invoice.controller'
import { authenticate, authorize, authorizeModule } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.use(authorizeModule('invoices'))

router.get('/', getInvoices)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'), createInvoice)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'), updateInvoice)
router.patch('/:id/status', authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'), updateInvoiceStatus)
router.get('/:id/document', getInvoiceDocument)
router.delete('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'), deleteInvoice)

export default router
