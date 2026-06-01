import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import prisma from '../utils/prisma'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const settings = await prisma.settings.findMany()
    const map = settings.reduce((acc: any, s) => { acc[s.key] = s.value; return acc }, {})
    res.json({ success: true, data: map })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to fetch settings' }) }
})

router.post('/email', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { gmailUser, gmailAppPassword, fromName } = req.body
    await Promise.all([
      prisma.settings.upsert({ where: { key: 'gmail_user' }, update: { value: gmailUser }, create: { key: 'gmail_user', value: gmailUser, group: 'email' } }),
      prisma.settings.upsert({ where: { key: 'gmail_app_password' }, update: { value: gmailAppPassword }, create: { key: 'gmail_app_password', value: gmailAppPassword, group: 'email' } }),
      prisma.settings.upsert({ where: { key: 'from_name' }, update: { value: fromName }, create: { key: 'from_name', value: fromName, group: 'email' } }),
    ])
    res.json({ success: true, message: 'Email config saved' })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to save email config' }) }
})

router.post('/whatsapp', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { phoneId, accessToken, businessId } = req.body
    await Promise.all([
      prisma.settings.upsert({ where: { key: 'wa_phone_id' }, update: { value: phoneId }, create: { key: 'wa_phone_id', value: phoneId, group: 'whatsapp' } }),
      prisma.settings.upsert({ where: { key: 'wa_access_token' }, update: { value: accessToken }, create: { key: 'wa_access_token', value: accessToken, group: 'whatsapp' } }),
      prisma.settings.upsert({ where: { key: 'wa_business_id' }, update: { value: businessId }, create: { key: 'wa_business_id', value: businessId, group: 'whatsapp' } }),
    ])
    res.json({ success: true, message: 'WhatsApp config saved' })
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to save WhatsApp config' }) }
})

export default router
