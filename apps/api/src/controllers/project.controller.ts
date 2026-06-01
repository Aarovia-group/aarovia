import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getProjects = async (req: Request, res: Response) => {
  try {
    const { search, isActive } = req.query
    const where: any = {}
    if (isActive !== undefined) where.isActive = isActive === 'true'
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { city: { contains: search as string, mode: 'insensitive' } },
      ]
    }
    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { inventory: true, leads: true, quotations: true } },
      },
    })
    res.json({ success: true, data: projects })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch projects', error })
  }
}

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        inventory: { select: { id: true, status: true, propertyType: true, area: true, baseRate: true } },
        emailTemplates: true,
        _count: { select: { leads: true, quotations: true } },
      },
    })
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' })
    res.json({ success: true, data: project })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch project', error })
  }
}

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, location, city, state, reraNumber, minPrice, maxPrice, propertyTypes, amenities, images } = req.body
    const project = await prisma.project.create({
      data: {
        name, description, location, city, state, reraNumber,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        propertyTypes: propertyTypes || [],
        amenities: amenities || [],
        images: images || [],
      },
    })
    res.status(201).json({ success: true, message: 'Project created', data: project })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create project', error })
  }
}

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const project = await prisma.project.update({ where: { id: req.params.id }, data: req.body })
    res.json({ success: true, message: 'Project updated', data: project })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update project', error })
  }
}

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.project.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ success: true, message: 'Project deactivated' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete project', error })
  }
}
