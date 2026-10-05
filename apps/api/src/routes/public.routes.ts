import { Router } from 'express'
import { submitPublicContact } from '../controllers/public-contact.controller'

const router = Router()
router.post('/', submitPublicContact)
router.post('/contact', submitPublicContact)

export default router