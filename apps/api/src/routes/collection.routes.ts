import { Router } from 'express'
import { getCollections, getDueCollections } from '../controllers/collection.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getCollections)
router.get('/due', getDueCollections)
export default router
