import { Router } from 'express'
import { getQuotations, getQuotationById, createQuotation, updateQuotation, updateQuotationStatus, deleteQuotation } from '../controllers/quotation.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', getQuotations)
router.post('/', createQuotation)
router.get('/:id', getQuotationById)
router.put('/:id', updateQuotation)
router.patch('/:id/status', updateQuotationStatus)
router.delete('/:id', authorize('SUPER_ADMIN', 'ADMIN'), deleteQuotation)

export default router
