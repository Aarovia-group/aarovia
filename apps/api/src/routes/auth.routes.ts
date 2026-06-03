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
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh-token', refreshToken)
router.post('/logout', logout)
router.get('/profile', authenticate, getProfile)
router.put('/profile', authenticate, updateProfile)
router.put('/change-password', authenticate, changePassword)

export default router
