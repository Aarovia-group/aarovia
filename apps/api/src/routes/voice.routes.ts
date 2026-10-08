import { Router } from 'express'
import { getVoiceToken, receiveMcubeCallback, releaseVoiceCall, startVoiceCall } from '../controllers/voice.controller'
import { authenticate, authorizeModule } from '../middleware/auth.middleware'

const router = Router()

router.post('/callback', receiveMcubeCallback)
router.get('/token', authenticate, authorizeModule('leads'), getVoiceToken)
router.post('/call/release', authenticate, authorizeModule('leads'), releaseVoiceCall)
router.post('/call', authenticate, authorizeModule('leads'), startVoiceCall)

export default router