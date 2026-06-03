import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../utils/prisma'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    name: string
  }
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' })
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET must be configured')
  }

  const token = authHeader.split(' ')[1]
  const decoded = jwt.verify(token, jwtSecret) as { id: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, name: true, isActive: true },
    })

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' })
    }

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name }
    next()
  } catch (error: any) {
    console.warn('[Auth] Authentication failed', error?.message || error)
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' })
    }
    next()
  }
}
