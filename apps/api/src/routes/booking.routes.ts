import { Router } from 'express'
import { getBookings, getBookingById, createBooking, updateBooking, addPayment } from '../controllers/booking.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', getBookings)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE'), createBooking)
router.get('/:id', getBookingById)
router.put('/:id', updateBooking)
router.post('/:id/payment', authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'), addPayment)

export default router
