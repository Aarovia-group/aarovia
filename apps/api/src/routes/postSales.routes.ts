import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import prisma from '../utils/prisma'

const router = Router()
router.use(authenticate)

router.get('/overview', async (req, res) => {
  try {
    const [pending, inProgress, completed, registered] = await Promise.all([
      prisma.booking.count({ where: { agreementStatus: 'PENDING' } }),
      prisma.booking.count({ where: { agreementStatus: { in: ['INITIATED', 'IN_PROGRESS'] } } }),
      prisma.booking.count({ where: { agreementStatus: 'COMPLETED' } }),
      prisma.booking.count({ where: { agreementStatus: 'REGISTERED' } }),
    ])
    res.json({ success: true, data: { pending, inProgress, completed, registered } })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to fetch post-sales overview' }) }
})

export default router
