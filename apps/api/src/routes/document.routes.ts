import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import prisma from '../utils/prisma'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { customerId, bookingId, category } = req.query
    const where: any = {}
    if (customerId) where.customerId = customerId
    if (bookingId) where.bookingId = bookingId
    if (category) where.category = category
    const docs = await prisma.document.findMany({ where, orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: docs })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to fetch documents' }) }
})

router.post('/', async (req: any, res) => {
  try {
    const { name, category, url, mimeType, size, customerId, bookingId } = req.body
    const doc = await prisma.document.create({ data: { name, category, url, mimeType, size, customerId, bookingId } })
    res.status(201).json({ success: true, data: doc })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to upload document' }) }
})

export default router
