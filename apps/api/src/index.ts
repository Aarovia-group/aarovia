import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.routes'
import leadRoutes from './routes/lead.routes'
import customerRoutes from './routes/customer.routes'
import inventoryRoutes from './routes/inventory.routes'
import quotationRoutes from './routes/quotation.routes'
import bookingRoutes from './routes/booking.routes'
import invoiceRoutes from './routes/invoice.routes'
import collectionRoutes from './routes/collection.routes'
import reportRoutes from './routes/report.routes'
import notificationRoutes from './routes/notification.routes'
import userRoutes from './routes/user.routes'
import projectRoutes from './routes/project.routes'
import settingsRoutes from './routes/settings.routes'
import emailRoutes from './routes/email.routes'
import whatsappRoutes from './routes/whatsapp.routes'
import documentRoutes from './routes/document.routes'
import postSalesRoutes from './routes/postSales.routes'
import uploadRoutes from './routes/upload.routes'
import { errorHandler } from './middleware/error.middleware'
import { notFound } from './middleware/notFound.middleware'
import { auditLog, requestTimer } from './middleware/audit.middleware'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Trust reverse proxy headers (required for Vercel / proxy deployments)
app.set('trust proxy', 1)

// Security middleware
app.use(helmet())
const frontendOrigins = process.env.NODE_ENV === 'production'
  ? [
      ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((url) => url.trim()) : ['https://aarovia.co.in', 'https://www.aarovia.co.in']),
      'https://web-aarovia.vercel.app',
    ]
  : ['http://localhost:3000', 'http://localhost:3001']
app.use(cors({
  origin: frontendOrigins,
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later.',
})
app.use('/api/', limiter)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// Audit & timing middleware
app.use(requestTimer)
app.use(auditLog)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Aarovia CRM API' })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/quotations', quotationRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/collections', collectionRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/users', userRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/email', emailRoutes)
app.use('/api/whatsapp', whatsappRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/post-sales', postSalesRoutes)
app.use('/api/upload', uploadRoutes)

// Error handling
app.use(notFound)
app.use(errorHandler)

export default app
