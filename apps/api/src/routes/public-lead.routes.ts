import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { captureWebsiteLead } from '../controllers/public-lead.controller'

const router = Router()

const leadCaptureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
})

router.post('/', leadCaptureLimiter, captureWebsiteLead)

export default router
