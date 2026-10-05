import express, { Router } from 'express'
import { receiveWhatsAppWebhook, verifyWhatsAppWebhook } from '../controllers/whatsapp-webhook.controller'

const router = Router()

router.get('/', verifyWhatsAppWebhook)
router.post('/', express.raw({ type: 'application/json', limit: '10mb' }), receiveWhatsAppWebhook)

export default router