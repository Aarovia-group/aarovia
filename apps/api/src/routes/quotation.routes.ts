import { Router } from 'express'
import { getQuotations, getQuotationById, createQuotation, updateQuotation, updateQuotationStatus, deleteQuotation } from '../controllers/quotation.controller'
import { authenticate, authorize, authorizeModule } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.use(authorizeModule('quotations'))

router.get('/', getQuotations)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE'), createQuotation)
router.get('/:id', getQuotationById)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE'), updateQuotation)
router.patch('/:id/status', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE'), updateQuotationStatus)
router.delete('/:id', authorize('SUPER_ADMIN', 'ADMIN'), deleteQuotation)

export default router
