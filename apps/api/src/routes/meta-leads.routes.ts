import express, { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import {
  checkMetaPageToken,
  getRecentMetaWebhookEvents,
  receiveMetaLeadWebhook,
  subscribeMetaPage,
  verifyMetaLeadWebhook,
} from '../controllers/meta-leads'

const router = Router()

router.get('/', verifyMetaLeadWebhook)
router.post('/', express.raw({ type: 'application/json', limit: '1mb' }), receiveMetaLeadWebhook)
router.get('/events', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), getRecentMetaWebhookEvents)
router.post('/token-check', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), checkMetaPageToken)
router.post('/subscribe', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), subscribeMetaPage)

export default router
