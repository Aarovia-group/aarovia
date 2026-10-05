import { Router } from 'express'
import { getVoiceToken, receiveMcubeCallback, startVoiceCall } from '../controllers/voice.controller'
import { authenticate, authorizeModule } from '../middleware/auth.middleware'

const router = Router()

router.post('/callback', receiveMcubeCallback)
router.get('/token', authenticate, authorizeModule('leads'), getVoiceToken)
router.post('/call', authenticate, authorizeModule('leads'), startVoiceCall)

export default router