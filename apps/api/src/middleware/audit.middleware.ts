import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'
import logger from '../utils/logger'

// Audit middleware logs all POST/PUT/PATCH/DELETE requests
export const auditLog = (req: AuthRequest, res: Response, next: NextFunction) => {
  const auditableMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (!auditableMethods.includes(req.method)) return next()

  const start = Date.now()

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - start
    const userId = req.user?.id || 'anonymous'
    const userName = req.user?.name || 'Anonymous'

    // Skip logging sensitive routes
    const sensitiveRoutes = ['/api/auth/login', '/api/auth/change-password']
    if (sensitiveRoutes.some(r => req.path.includes(r))) return

    logger.info(`AUDIT: ${req.method} ${req.originalUrl}`, {
      userId,
      userName,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
  })

  next()
}

// Request timing middleware
export const requestTimer = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    if (duration > 2000) {
      logger.warn(`Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`)
    }
  })
  next()
}

// Rate limit logging
export const logRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const rateLimitRemaining = res.getHeader('X-RateLimit-Remaining')
  if (rateLimitRemaining !== undefined && parseInt(rateLimitRemaining as string) < 10) {
    logger.warn(`Rate limit nearly exceeded for IP ${req.ip}: ${rateLimitRemaining} remaining`)
  }
  next()
}
