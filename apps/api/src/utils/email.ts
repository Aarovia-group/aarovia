import nodemailer from 'nodemailer'
import prisma from './prisma'

const getStoredEmailSetting = async (key: string) => {
  const setting = await prisma.settings.findUnique({ where: { key } })
  return setting?.value?.trim() || ''
}

export const getSmtpOptions = async () => {
  const envUser = process.env.SMTP_USER || process.env.GMAIL_USER
  const envPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
  const [storedUser, storedPass] = envUser && envPass
    ? ['', '']
    : await Promise.all([
        envUser ? Promise.resolve('') : getStoredEmailSetting('smtp_user'),
        envPass ? Promise.resolve('') : getStoredEmailSetting('smtp_pass'),
      ])
  const user = envUser || storedUser
  const pass = envPass || storedPass
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : undefined

  if (!user || !pass) {
    throw new Error('SMTP credentials are not configured. Save Zoho credentials in Settings > Email Config or set SMTP_USER/SMTP_PASS.')
  }

  return {
    host: host || 'smtp.zoho.in',
    port: port || 587,
    secure: secure ?? false,
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
  }
}

export const createTransporter = () => {
  return getSmtpOptions().then(options => nodemailer.createTransport(options))
}

export const getCustomerFacingEmail = async () =>
  process.env.SMTP_USER
  || process.env.GMAIL_USER
  || await getStoredEmailSetting('smtp_user')

export const getSenderDisplayName = async () =>
  (await getStoredEmailSetting('from_name')) || process.env.FROM_NAME || 'Aarovia Real Estates'
