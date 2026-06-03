import { Router } from 'express'
import { getInventory, getInventoryById, createInventory, updateInventory, updateInventoryStatus, getInventoryHeatmap, deleteInventory, importInventory } from '../controllers/inventory.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', getInventory)
router.get('/heatmap/:projectId', getInventoryHeatmap)
router.post('/import', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'), importInventory)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'), createInventory)
router.get('/:id', getInventoryById)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'), updateInventory)
router.patch('/:id/status', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'), updateInventoryStatus)
router.delete('/:id', authorize('SUPER_ADMIN', 'ADMIN'), deleteInventory)

export default router
