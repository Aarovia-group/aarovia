import { Router } from 'express'
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
} from '../controllers/auth.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { loginSchema, registerSchema, changePasswordSchema } from '../validations/schemas'

const router = Router()

router.post('/register', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/refresh-token', refreshToken)
router.post('/logout', logout)
router.get('/profile', authenticate, getProfile)
router.put('/profile', authenticate, updateProfile)
router.put('/change-password', authenticate, validate(changePasswordSchema), changePassword)

export default router
