import { Request, Response, NextFunction } from 'express'

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err)

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
      field: err.meta?.target,
    })
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found' })
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message })
  }

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
}
