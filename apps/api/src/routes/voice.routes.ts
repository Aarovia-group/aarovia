import { Router } from 'express'
import { getVoiceToken, receiveMcubeCallback, startVoiceCall } from '../controllers/voice.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.post('/callback', receiveMcubeCallback)
router.get('/token', authenticate, getVoiceToken)
router.post('/call', authenticate, startVoiceCall)

export default router