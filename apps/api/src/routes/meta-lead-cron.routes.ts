import { Router } from 'express'
import { runMetaLeadBackfill } from '../controllers/meta-leads'

const router = Router()

router.get('/', runMetaLeadBackfill)

export default router
