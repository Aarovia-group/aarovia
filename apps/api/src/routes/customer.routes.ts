import { Router } from 'express'
import { getCustomers, getCustomerById, createCustomer, updateCustomer, verifyKyc } from '../controllers/customer.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', getCustomers)
router.post('/', createCustomer)
router.get('/:id', getCustomerById)
router.put('/:id', updateCustomer)
router.patch('/:id/verify-kyc', authorize('SUPER_ADMIN', 'ADMIN', 'CRM_TEAM'), verifyKyc)

export default router
