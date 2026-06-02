import nodemailer from 'nodemailer'

const getSmtpOptions = () => {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : undefined

  if (!user || !pass) {
    throw new Error('SMTP credentials are not configured. Set SMTP_USER/SMTP_PASS or GMAIL_USER/GMAIL_APP_PASSWORD.')
  }

  if (host) {
    return {
      host,
      port: port || 465,
      secure: secure ?? true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    }
  }

  return {
    service: 'gmail',
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  }
}

export const createTransporter = () => {
  return nodemailer.createTransport(getSmtpOptions())
}
