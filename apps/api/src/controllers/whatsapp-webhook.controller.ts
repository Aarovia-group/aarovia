import { createHmac, timingSafeEqual } from 'crypto'
import { Request, Response } from 'express'
import prisma from '../utils/prisma'

export const verifyWhatsAppWebhook = (req: Request, res: Response) => {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (!verifyToken) return res.status(503).send('WhatsApp webhook verify token is not configured')
  if (mode !== 'subscribe' || token !== verifyToken || typeof challenge !== 'string') return res.sendStatus(403)

  return res.status(200).type('text/plain').send(challenge)
}

export const receiveWhatsAppWebhook = async (req: Request, res: Response) => {
  const body = req.body
  if (!Buffer.isBuffer(body)) return res.sendStatus(400)

  try {
    const signature = req.get('x-hub-signature-256') || ''
    const appSecret = process.env.META_APP_SECRET
      || (await prisma.settings.findUnique({ where: { key: 'meta_app_secret' }, select: { value: true } }))?.value
    if (!appSecret || !signature) return res.sendStatus(401)

    const expectedSignature = Buffer.from(`sha256=${createHmac('sha256', appSecret).update(body).digest('hex')}`)
    const receivedSignature = Buffer.from(signature)
    if (expectedSignature.length !== receivedSignature.length || !timingSafeEqual(expectedSignature, receivedSignature)) {
      return res.sendStatus(401)
    }

    const payload = JSON.parse(body.toString('utf8'))
    const messages = (payload.entry || []).flatMap((entry: any) =>
      (entry.changes || []).flatMap((change: any) => change.value?.messages || []),
    )
    const inboundLogs = messages.flatMap((message: any) => {
      const sender = String(message.from || '').trim()
      if (!sender) return []
      const text = message.text?.body
        || message.interactive?.button_reply?.title
        || message.interactive?.list_reply?.title
        || `Incoming WhatsApp ${message.type || 'message'}`
      return [{ to: sender, message: String(text), status: 'RECEIVED' }]
    })

    if (inboundLogs.length) await prisma.whatsappLog.createMany({ data: inboundLogs })
    return res.sendStatus(200)
  } catch (error: any) {
    console.error('[WhatsApp] Webhook processing failed', error.message)
    return res.sendStatus(500)
  }
}