import { Router } from 'express'
import { getUsers, getUserById, updateUser, resetUserPassword, deleteUser } from '../controllers/user.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', authorize('SUPER_ADMIN', 'ADMIN'), getUsers)
router.get('/:id', authorize('SUPER_ADMIN', 'ADMIN'), getUserById)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN'), updateUser)
router.patch('/:id/reset-password', authorize('SUPER_ADMIN', 'ADMIN'), resetUserPassword)
router.delete('/:id', authorize('SUPER_ADMIN'), deleteUser)

export default router
