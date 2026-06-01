// Simple structured logger for Aarovia CRM API
// In production, replace with winston or pino for log aggregation

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  service: string
  data?: any
}

const formatLog = (level: LogLevel, message: string, data?: any): LogEntry => ({
  level,
  message,
  timestamp: new Date().toISOString(),
  service: 'aarovia-api',
  ...(data && { data }),
})

const isDev = process.env.NODE_ENV !== 'production'

export const logger = {
  info: (message: string, data?: any) => {
    const entry = formatLog('info', message, data)
    if (isDev) {
      console.log(`\x1b[36m[INFO]\x1b[0m ${entry.timestamp} — ${message}`, data ? data : '')
    } else {
      console.log(JSON.stringify(entry))
    }
  },

  warn: (message: string, data?: any) => {
    const entry = formatLog('warn', message, data)
    if (isDev) {
      console.warn(`\x1b[33m[WARN]\x1b[0m ${entry.timestamp} — ${message}`, data ? data : '')
    } else {
      console.warn(JSON.stringify(entry))
    }
  },

  error: (message: string, error?: any) => {
    const entry = formatLog('error', message, error instanceof Error ? { message: error.message, stack: error.stack } : error)
    if (isDev) {
      console.error(`\x1b[31m[ERROR]\x1b[0m ${entry.timestamp} — ${message}`, error || '')
    } else {
      console.error(JSON.stringify(entry))
    }
  },

  debug: (message: string, data?: any) => {
    if (!isDev) return
    console.debug(`\x1b[35m[DEBUG]\x1b[0m ${new Date().toISOString()} — ${message}`, data ? data : '')
  },

  // Log API request details
  request: (method: string, path: string, userId?: string, duration?: number) => {
    const msg = `${method} ${path}${userId ? ` [user:${userId}]` : ''}${duration ? ` ${duration}ms` : ''}`
    logger.info(msg)
  },

  // Log database operations in dev
  db: (operation: string, model: string, data?: any) => {
    if (!isDev) return
    logger.debug(`DB ${operation} on ${model}`, data)
  },
}

export default logger
