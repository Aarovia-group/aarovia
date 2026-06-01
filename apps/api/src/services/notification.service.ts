import prisma from '../utils/prisma'
import nodemailer from 'nodemailer'
import axios from 'axios'

interface NotificationPayload {
  userId: string
  title: string
  message: string
  channel?: 'EMAIL' | 'WHATSAPP' | 'IN_APP'
  metadata?: Record<string, any>
}

// ============================================
// Create in-app notification
// ============================================
export const createNotification = async (payload: NotificationPayload) => {
  return prisma.notification.create({
    data: {
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      channel: payload.channel || 'IN_APP',
      metadata: payload.metadata,
    },
  })
}

// ============================================
// Bulk notify multiple users
// ============================================
export const notifyUsers = async (userIds: string[], title: string, message: string) => {
  return prisma.notification.createMany({
    data: userIds.map(userId => ({ userId, title, message, channel: 'IN_APP' as const })),
  })
}

// ============================================
// Notify all admins and sales managers
// ============================================
export const notifyManagers = async (title: string, message: string) => {
  const managers = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'] }, isActive: true },
    select: { id: true },
  })
  const userIds = managers.map(m => m.id)
  return notifyUsers(userIds, title, message)
}

// ============================================
// Email notification
// ============================================
export const sendEmailNotification = async (
  to: string,
  subject: string,
  body: string
) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: `"Aarovia CRM" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: body,
    })
    return { success: true }
  } catch (error) {
    console.error('Email notification failed:', error)
    return { success: false, error }
  }
}

// ============================================
// WhatsApp notification
// ============================================
export const sendWhatsAppNotification = async (to: string, message: string) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return { success: true, data: response.data }
  } catch (error: any) {
    console.error('WhatsApp notification failed:', error?.response?.data || error)
    return { success: false, error }
  }
}

// ============================================
// Followup reminder service
// ============================================
export const sendFollowupReminders = async () => {
  const now = new Date()
  const leads = await prisma.lead.findMany({
    where: {
      nextFollowupDate: { lte: now },
      isActive: true,
      status: { notIn: ['BOOKED', 'OPPORTUNITY_CLOSED', 'OPPORTUNITY_NOT_INTERESTED'] },
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, phone: true } },
    },
  })

  const reminders = []
  for (const lead of leads) {
    if (lead.assignedTo) {
      // In-app notification
      const notif = await createNotification({
        userId: lead.assignedTo.id,
        title: 'Followup Reminder',
        message: `Followup due for ${lead.name} (${lead.mobile}) — Status: ${lead.status}`,
        metadata: { leadId: lead.id },
      })
      reminders.push(notif)
    }
  }

  return { count: reminders.length }
}

// ============================================
// Payment due reminder service
// ============================================
export const sendPaymentDueReminders = async () => {
  const overdueBookings = await prisma.booking.findMany({
    where: { dueAmount: { gt: 0 } },
    include: {
      customer: { select: { name: true, mobile: true, email: true } },
      inventory: { select: { unitNumber: true } },
    },
  })

  const admins = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'] }, isActive: true },
    select: { id: true },
  })

  if (overdueBookings.length > 0 && admins.length > 0) {
    await notifyUsers(
      admins.map(a => a.id),
      'Payment Due Alert',
      `${overdueBookings.length} bookings have outstanding payments. Total due: ₹${overdueBookings.reduce((s, b) => s + b.dueAmount, 0).toLocaleString('en-IN')}`
    )
  }

  return { count: overdueBookings.length }
}

// ============================================
// New lead assigned notification
// ============================================
export const notifyLeadAssignment = async (
  assignedToId: string,
  leadName: string,
  leadId: string
) => {
  return createNotification({
    userId: assignedToId,
    title: 'New Lead Assigned',
    message: `${leadName} has been assigned to you. Follow up within 2 hours.`,
    channel: 'IN_APP',
    metadata: { leadId },
  })
}

// ============================================
// Booking confirmation notification
// ============================================
export const notifyBookingCreated = async (
  booking: { id: string; bookingNumber: string; totalAmount: number },
  customerName: string,
  unitNumber: string
) => {
  return notifyManagers(
    'New Booking Confirmed! 🎉',
    `${customerName} has booked Unit ${unitNumber} for ${booking.totalAmount.toLocaleString('en-IN')}. Booking: ${booking.bookingNumber}`
  )
}
