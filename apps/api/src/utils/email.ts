import nodemailer from 'nodemailer'
import prisma from './prisma'

const getStoredEmailSetting = async (key: string) => {
  try {
    const setting = await prisma.settings.findUnique({ where: { key } })
    return setting?.value?.trim() || ''
  } catch {
    return ''
  }
}

export const getSmtpOptions = () => {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : undefined

  if (!user || !pass) {
    throw new Error('SMTP credentials are not configured. Set SMTP_USER/SMTP_PASS or GMAIL_USER/GMAIL_APP_PASSWORD.')
  }

  return {
    host: host || 'smtp.gmail.com',
    port: port || (host ? 465 : 587),
    secure: secure ?? Boolean(host),
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  }
}

export const createTransporter = () => {
  return nodemailer.createTransport(getSmtpOptions())
}

export const getCustomerFacingEmail = async () =>
  (await getStoredEmailSetting('smtp_user')) || process.env.SMTP_USER || process.env.GMAIL_USER || ''

export const getSenderDisplayName = async () =>
  (await getStoredEmailSetting('from_name')) || process.env.FROM_NAME || 'Aarovia Real Estates'
