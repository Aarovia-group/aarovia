import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { captureAaroviaContactLead, captureWebsiteLead } from '../controllers/public-lead.controller'

const router = Router()

const leadCaptureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
})

router.post('/', leadCaptureLimiter, captureWebsiteLead)
router.post('/aarovia-website', leadCaptureLimiter, captureAaroviaContactLead)

export default router
