import { Router } from 'express'
import { getCustomers, getCustomerById, createCustomer, updateCustomer, verifyKyc } from '../controllers/customer.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { createCustomerSchema } from '../validations/schemas'

const router = Router()
router.use(authenticate)

router.get('/', getCustomers)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'CRM_TEAM'), validate(createCustomerSchema), createCustomer)
router.get('/:id', getCustomerById)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'CRM_TEAM'), updateCustomer)
router.patch('/:id/verify-kyc', authorize('SUPER_ADMIN', 'ADMIN', 'CRM_TEAM'), verifyKyc)

export default router
