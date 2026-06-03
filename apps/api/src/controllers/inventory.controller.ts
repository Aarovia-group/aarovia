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

export const importInventory = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, units } = req.body
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'projectId is required for import' })
    }

    if (!Array.isArray(units) || units.length === 0) {
      return res.status(400).json({ success: false, message: 'No inventory rows provided for import' })
    }

    const validPropertyTypes = ['VILLA', 'APARTMENT', 'PLOT', 'FARMLAND', 'COMMERCIAL']
    const validStatus = ['AVAILABLE', 'BLOCKED', 'SOLD', 'RESERVED']
    const errors: string[] = []
    const seen = new Set<string>()
    const importRows: any[] = []

    units.forEach((row: any, index: number) => {
      const rowIndex = index + 1
      const unitNumber = row.unitNumber?.toString().trim()
      const projectKey = `${projectId}:${unitNumber}`
      const area = row.area !== undefined && row.area !== null ? parseFloat(row.area) : NaN
      const baseRate = row.baseRate !== undefined && row.baseRate !== null ? parseFloat(row.baseRate) : NaN
      const propertyType = row.propertyType?.toString().trim().toUpperCase()
      const status = row.status?.toString().trim().toUpperCase()

      if (!unitNumber) {
        errors.push(`Row ${rowIndex}: unitNumber is required`)
      }
      if (Number.isNaN(area) || area <= 0) {
        errors.push(`Row ${rowIndex}: area must be a valid number`)
      }
      if (Number.isNaN(baseRate) || baseRate <= 0) {
        errors.push(`Row ${rowIndex}: baseRate must be a valid number`)
      }
      if (!validPropertyTypes.includes(propertyType)) {
        errors.push(`Row ${rowIndex}: propertyType must be one of ${validPropertyTypes.join(', ')}`)
      }
      if (status && !validStatus.includes(status)) {
        errors.push(`Row ${rowIndex}: status must be one of ${validStatus.join(', ')}`)
      }
      if (seen.has(projectKey)) {
        errors.push(`Row ${rowIndex}: duplicate unitNumber ${unitNumber} for the selected project`) 
      }

      if (!errors.some(e => e.startsWith(`Row ${rowIndex}:`))) {
        seen.add(projectKey)
        importRows.push({
          unitNumber,
          tower: row.tower?.toString().trim() || null,
          floor: row.floor !== undefined && row.floor !== null && row.floor !== '' ? parseInt(row.floor, 10) : null,
          area,
          facing: row.facing?.toString().trim() || null,
          baseRate,
          finalRate: row.finalRate !== undefined && row.finalRate !== null && row.finalRate !== '' ? parseFloat(row.finalRate) : null,
          propertyType,
          bedrooms: row.bedrooms !== undefined && row.bedrooms !== null && row.bedrooms !== '' ? parseInt(row.bedrooms, 10) : null,
          bathrooms: row.bathrooms !== undefined && row.bathrooms !== null && row.bathrooms !== '' ? parseInt(row.bathrooms, 10) : null,
          notes: row.notes?.toString().trim() || null,
          status: status || undefined,
          projectId,
        })
      }
    })

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Import validation failed', errors })
    }

    const result = await prisma.inventory.createMany({
      data: importRows.map((row) => ({
        unitNumber: row.unitNumber,
        tower: row.tower,
        floor: row.floor,
        area: row.area,
        facing: row.facing,
        baseRate: row.baseRate,
        finalRate: row.finalRate,
        propertyType: row.propertyType,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        notes: row.notes,
        status: row.status,
        projectId: row.projectId,
      })),
      skipDuplicates: true,
    })

    res.status(201).json({
      success: true,
      message: 'Inventory import completed',
      imported: result.count,
      requested: importRows.length,
      skippedDuplicates: importRows.length - result.count,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Inventory import failed', error })
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
