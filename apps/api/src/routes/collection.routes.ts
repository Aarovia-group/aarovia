import { Router } from 'express'
import { getCollections, getDueCollections } from '../controllers/collection.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'CRM_TEAM'), getCollections)
router.get('/due', authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'CRM_TEAM'), getDueCollections)
export default router
