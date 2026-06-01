import { Request, Response } from 'express'
import prisma from '../utils/prisma'

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search, isKycVerified } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const where: any = {}
    if (isKycVerified !== undefined) where.isKycVerified = isKycVerified === 'true'
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { mobile: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { panNumber: { contains: search as string, mode: 'insensitive' } },
      ]
    }
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { bookings: true, documents: true } } },
      }),
      prisma.customer.count({ where }),
    ])
    res.json({ success: true, data: customers, meta: { total, page: parseInt(page as string), limit: parseInt(limit as string) } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customers', error })
  }
}

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        bookings: { include: { inventory: { include: { project: true } } } },
        documents: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { paymentDate: 'desc' }, take: 10 },
      },
    })
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' })
    res.json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customer', error })
  }
}

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.create({ data: req.body })
    res.status(201).json({ success: true, message: 'Customer created', data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create customer', error })
  }
}

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: req.body })
    res.json({ success: true, message: 'Customer updated', data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update customer', error })
  }
}

export const verifyKyc = async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: { isKycVerified: true } })
    res.json({ success: true, message: 'KYC verified', data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify KYC', error })
  }
}
