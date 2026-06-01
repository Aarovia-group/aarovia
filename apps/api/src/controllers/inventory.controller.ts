import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getInventory = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', status, projectId, propertyType, floor, tower, search } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const where: any = {}

    if (status) where.status = status
    if (projectId) where.projectId = projectId as string
    if (propertyType) where.propertyType = propertyType
    if (floor) where.floor = parseInt(floor as string)
    if (tower) where.tower = { contains: tower as string, mode: 'insensitive' }
    if (search) {
      where.OR = [
        { unitNumber: { contains: search as string, mode: 'insensitive' } },
        { tower: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const [inventory, total] = await Promise.all([
      prisma.inventory.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: [{ tower: 'asc' }, { floor: 'asc' }, { unitNumber: 'asc' }],
        include: {
          project: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, mobile: true } },
        },
      }),
      prisma.inventory.count({ where }),
    ])

    res.json({
      success: true, data: inventory,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch inventory', error })
  }
}

export const getInventoryById = async (req: Request, res: Response) => {
  try {
    const inventory = await prisma.inventory.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        customer: true,
        quotations: { orderBy: { createdAt: 'desc' }, take: 5 },
        booking: { include: { customer: true } },
      },
    })
    if (!inventory) return res.status(404).json({ success: false, message: 'Unit not found' })
    res.json({ success: true, data: inventory })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch unit', error })
  }
}

export const createInventory = async (req: AuthRequest, res: Response) => {
  try {
    const { unitNumber, tower, floor, area, facing, baseRate, finalRate,
      propertyType, bedrooms, bathrooms, projectId, notes } = req.body

    const inventory = await prisma.inventory.create({
      data: {
        unitNumber, tower, floor: floor ? parseInt(floor) : null,
        area: parseFloat(area), facing, baseRate: parseFloat(baseRate),
        finalRate: finalRate ? parseFloat(finalRate) : null,
        propertyType, bedrooms, bathrooms, projectId, notes,
      },
    })

    res.status(201).json({ success: true, message: 'Unit created', data: inventory })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create unit', error })
  }
}

export const updateInventory = async (req: AuthRequest, res: Response) => {
  try {
    const inventory = await prisma.inventory.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json({ success: true, message: 'Unit updated', data: inventory })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update unit', error })
  }
}

export const updateInventoryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status, customerId } = req.body
    const inventory = await prisma.inventory.update({
      where: { id: req.params.id },
      data: { status, customerId: customerId || null },
    })
    res.json({ success: true, message: 'Status updated', data: inventory })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status', error })
  }
}

export const getInventoryHeatmap = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const inventory = await prisma.inventory.findMany({
      where: { projectId },
      select: { id: true, unitNumber: true, tower: true, floor: true, status: true, area: true, baseRate: true },
      orderBy: [{ tower: 'asc' }, { floor: 'asc' }],
    })

    const summary = {
      available: inventory.filter(i => i.status === 'AVAILABLE').length,
      blocked: inventory.filter(i => i.status === 'BLOCKED').length,
      sold: inventory.filter(i => i.status === 'SOLD').length,
      reserved: inventory.filter(i => i.status === 'RESERVED').length,
      total: inventory.length,
    }

    res.json({ success: true, data: { inventory, summary } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch heatmap', error })
  }
}

export const deleteInventory = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.inventory.delete({ where: { id: req.params.id } })
    res.json({ success: true, message: 'Unit deleted' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete unit', error })
  }
}
