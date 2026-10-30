import { Router, json } from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { auditLog, requestTimer } from '../middleware/audit.middleware'
import { captureQuietEstateWebsiteLead } from '../controllers/quiet-estate-website.controller'

const router = Router()
const parseJsonBody = json()
const websiteCors = cors({
  origin: 'https://questestate.aaroviagroup.com',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204,
})
const leadCaptureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again in a minute.' },
})

router.options('/', websiteCors)
router.post(
  '/',
  websiteCors,
  requestTimer,
  auditLog,
  leadCaptureLimiter,
  (req, res, next) => {
    parseJsonBody(req, res, error => {
      if (error) return res.status(400).json({ success: false, message: 'Request body must be valid JSON.' })
      next()
    })
  },
  captureQuietEstateWebsiteLead,
)

export default router
