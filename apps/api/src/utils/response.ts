import { Response } from 'express'

// Standard success response
export const success = (res: Response, data: any, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data })
}

// Paginated success response
export const paginated = (
  res: Response,
  data: any[],
  meta: { total: number; page: number; limit: number }
) => {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      ...meta,
      totalPages: Math.ceil(meta.total / meta.limit),
    },
  })
}

// Error response
export const error = (res: Response, message: string, statusCode = 500, errors?: any) => {
  return res.status(statusCode).json({ success: false, message, ...(errors && { errors }) })
}

// Not found response
export const notFound = (res: Response, entity = 'Record') => {
  return res.status(404).json({ success: false, message: `${entity} not found` })
}

// Unauthorized response
export const unauthorized = (res: Response, message = 'Unauthorized') => {
  return res.status(401).json({ success: false, message })
}

// Forbidden response
export const forbidden = (res: Response, message = 'Insufficient permissions') => {
  return res.status(403).json({ success: false, message })
}

// Validation error response
export const validationError = (res: Response, errors: Array<{ field: string; message: string }>) => {
  return res.status(400).json({ success: false, message: 'Validation failed', errors })
}

// Build pagination query params
export const getPaginationParams = (query: Record<string, any>) => {
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20))
  const skip = (page - 1) * limit
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) === 'asc' ? 'asc' : 'desc'
  return { page, limit, skip, sortBy, sortOrder }
}

// Build date range filter
export const getDateRangeFilter = (from?: string, to?: string) => {
  if (!from && !to) return undefined
  const filter: Record<string, Date> = {}
  if (from) filter.gte = new Date(from)
  if (to) filter.lte = new Date(to)
  return filter
}

// Build search filter for common string fields
export const getSearchFilter = (search: string, fields: string[]) => {
  if (!search) return undefined
  return {
    OR: fields.map(field => ({
      [field]: { contains: search, mode: 'insensitive' as const },
    })),
  }
}
