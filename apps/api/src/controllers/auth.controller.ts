import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import prisma from '../utils/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET must be configured')
  }
  return secret
}

export const parseDuration = (value: string) => {
  const match = value.match(/^(\d+)([smhd])$/)
  if (!match) return 0

  const amount = Number(match[1])
  switch (match[2]) {
    case 's': return amount * 1000
    case 'm': return amount * 60 * 1000
    case 'h': return amount * 60 * 60 * 1000
    case 'd': return amount * 24 * 60 * 60 * 1000
    default: return 0
  }
}

const normalizeExpiry = (value: string | undefined, fallback: string) => {
  const expiry = value?.trim()
  if (!expiry) return fallback
  if (parseDuration(expiry) > 0) return expiry
  console.warn(`Invalid token expiry value: ${value}. Falling back to ${fallback}.`)
  return fallback
}

const getAccessTokenExpiresIn = () => {
  return normalizeExpiry(process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_EXPIRES_IN, '15m')
}

const getRefreshTokenExpiresIn = () => {
  return normalizeExpiry(process.env.REFRESH_TOKEN_EXPIRES_IN, '30d')
}

const getRefreshTokenExpiration = () => {
  const raw = getRefreshTokenExpiresIn()
  const ms = parseDuration(raw)
  return new Date(Date.now() + (ms > 0 ? ms : 30 * 24 * 60 * 60 * 1000))
}

export const getJwtCookieOptions = () => {
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    domain: cookieDomain,
  }
}

export const parseCookies = (cookieHeader?: string) => {
  return (cookieHeader || '').split(';').reduce<Record<string, string>>((cookies, cookie) => {
    const [name, ...rest] = cookie.split('=')
    if (!name || rest.length === 0) return cookies
    cookies[name.trim()] = decodeURIComponent(rest.join('=').trim())
    return cookies
  }, {})
}

const generateToken = (id: string) => {
  const jwtSecret = getJwtSecret()
  const expiresIn = getAccessTokenExpiresIn()
  console.info(`[Auth] Generating access token for user=${id}, expiresIn=${expiresIn}`)
  return jwt.sign({ id }, jwtSecret, {
    expiresIn,
  } as jwt.SignOptions)
}

const createRefreshToken = async (userId: string, req: Request) => {
  const token = crypto.randomBytes(48).toString('hex')
  const expiresAt = getRefreshTokenExpiration()

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
      ipAddress: req.ip,
      userAgent: String(req.headers['user-agent'] || ''),
    },
  })

  return { token, expiresAt }
}

const sendRefreshTokenCookie = (res: Response, token: string, expiresAt: Date) => {
  const maxAge = Math.max(0, expiresAt.getTime() - Date.now())
  res.cookie('refreshToken', token, {
    ...getJwtCookieOptions(),
    expires: expiresAt,
    maxAge,
  })
}

const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie('refreshToken', {
    ...getJwtCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  })
}

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, role } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, phone, role: role || 'SALES_EXECUTIVE' },
      select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
    })

    const token = generateToken(user.id)
    const refreshToken = await createRefreshToken(user.id, req)
    sendRefreshTokenCookie(res, refreshToken.token, refreshToken.expiresAt)

    res.status(201).json({ success: true, message: 'User registered successfully', data: { user, token } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed', error })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    // Log login history
    console.info(`[Auth] Login success for user=${user.id}, email=${email}, ip=${req.ip}`)
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const token = generateToken(user.id)
    const refreshToken = await createRefreshToken(user.id, req)
    sendRefreshTokenCookie(res, refreshToken.token, refreshToken.expiresAt)

    const { password: _, ...userWithoutPassword } = user

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userWithoutPassword, token },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error })
  }
}

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const cookies = parseCookies(req.headers.cookie)
    const refreshToken = cookies.refreshToken

    if (!refreshToken) {
      console.warn('[Auth] Refresh request missing refresh token cookie')
      return res.status(401).json({ success: false, message: 'Refresh token not found' })
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      console.warn('[Auth] Invalid or expired refresh token', { token: refreshToken, userId: storedToken?.userId })
      clearRefreshTokenCookie(res)
      return res.status(401).json({ success: false, message: 'Refresh token expired or invalid' })
    }

    const user = storedToken.user
    if (!user || !user.isActive) {
      clearRefreshTokenCookie(res)
      return res.status(401).json({ success: false, message: 'User not found or inactive' })
    }

    const newRefreshToken = await createRefreshToken(user.id, req)
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { revoked: true, replacedByToken: newRefreshToken.token },
    })

    const accessToken = generateToken(user.id)
    sendRefreshTokenCookie(res, newRefreshToken.token, newRefreshToken.expiresAt)
    console.info(`[Auth] Refresh successful for user=${user.id}, ip=${req.ip}, ua=${req.headers['user-agent']}`)

    const { password: _, ...userWithoutPassword } = user
    res.json({ success: true, message: 'Token refreshed', data: { user: userWithoutPassword, token: accessToken } })
  } catch (error) {
    clearRefreshTokenCookie(res)
    res.status(401).json({ success: false, message: 'Refresh failed', error })
  }
}

export const logout = async (req: Request, res: Response) => {
  try {
    const cookies = parseCookies(req.headers.cookie)
    const refreshToken = cookies.refreshToken

    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
      })
    }

    clearRefreshTokenCookie(res)
    console.info(`[Auth] Logout completed for refreshToken=${refreshToken || 'none'}, ip=${req.ip}`)
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed', error })
  }
}

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, avatar: true, lastLogin: true, createdAt: true,
      },
    })
    res.json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error })
  }
}

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, avatar } = req.body
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, phone, avatar },
      select: { id: true, name: true, email: true, role: true, phone: true, avatar: true },
    })
    res.json({ success: true, message: 'Profile updated', data: user })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile', error })
  }
}

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } })
    res.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to change password', error })
  }
}
