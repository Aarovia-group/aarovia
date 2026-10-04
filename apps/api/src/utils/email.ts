import nodemailer from 'nodemailer'
import prisma from './prisma'

const emailSettingKeys = ['zoho_email', 'zoho_app_password', 'zoho_smtp_host', 'zoho_smtp_port', 'email_from_name']

export const getEmailConfiguration = async () => {
  const settings = await prisma.settings.findMany({ where: { key: { in: emailSettingKeys } } })
  const values = settings.reduce<Record<string, string>>((result, setting) => {
    result[setting.key] = setting.value
    return result
  }, {})

  const email = values.zoho_email || ''
  const password = values.zoho_app_password || ''
  const host = values.zoho_smtp_host || 'smtp.zoho.in'
  const port = Number(values.zoho_smtp_port || 465)

  if (!email || !password || !host || ![465, 587].includes(port)) {
    throw new Error('Zoho SMTP is not fully configured. Save the Zoho email, app password, host, and SMTP port in Settings.')
  }

  return {
    email,
    password,
    host,
    port,
    fromName: values.email_from_name || 'Aarovia Real Estates',
  }
}

export const createTransporter = async () => {
  const configuration = await getEmailConfiguration()
  return {
    transporter: nodemailer.createTransport({
      host: configuration.host,
      port: configuration.port,
      secure: configuration.port === 465,
      requireTLS: configuration.port === 587,
      auth: { user: configuration.email, pass: configuration.password },
    }),
    email: configuration.email,
    fromName: configuration.fromName,
  }
}
