import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../utils/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { search, role, page = '1', limit = '50' } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const where: any = {}
    if (role) where.role = role
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ]
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, isActive: true, lastLogin: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ])
    res.json({ success: true, data: users, meta: { total } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users', error })
  }
}

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, isActive: true, lastLogin: true, createdAt: true, loginHistory: { take: 5, orderBy: { loginAt: 'desc' } } },
    })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    res.json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user', error })
  }
}

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, role, isActive, avatar } = req.body
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (avatar !== undefined) updateData.avatar = avatar

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
    })
    res.json({ success: true, message: 'User updated', data: user })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user', error })
  }
}

export const resetUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'New password is required' })
    }

    const passwordRules = [
      { test: /.{8,}/, message: 'Password must be at least 8 characters long' },
      { test: /[A-Z]/, message: 'Password must contain at least one uppercase letter' },
      { test: /[a-z]/, message: 'Password must contain at least one lowercase letter' },
      { test: /[0-9]/, message: 'Password must contain at least one number' },
      { test: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, message: 'Password must contain at least one special character' },
    ]

    const failedRule = passwordRules.find((rule) => !rule.test.test(newPassword))
    if (failedRule) {
      return res.status(400).json({ success: false, message: failedRule.message })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: req.params.id }, data: { password: hashedPassword } })
    res.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reset password', error })
  }
}

export const deleteUser = async (req: Request, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ success: true, message: 'User deactivated' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deactivate user', error })
  }
}
