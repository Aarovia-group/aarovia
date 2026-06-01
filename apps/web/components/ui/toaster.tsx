'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}

let toastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null

export const toast = {
  success: (title: string, message?: string) => toastFn?.({ type: 'success', title, message }),
  error: (title: string, message?: string) => toastFn?.({ type: 'error', title, message }),
  warning: (title: string, message?: string) => toastFn?.({ type: 'warning', title, message }),
  info: (title: string, message?: string) => toastFn?.({ type: 'info', title, message }),
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...t, id }])
    setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 4000)
  }, [])

  toastFn = addToast

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-green-400" />,
    error: <XCircle className="w-4 h-4 text-red-400" />,
    warning: <AlertCircle className="w-4 h-4 text-yellow-400" />,
    info: <Info className="w-4 h-4 text-blue-400" />,
  }

  const styles = {
    success: 'border-green-500/30 bg-green-500/5',
    error: 'border-red-500/30 bg-red-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <div key={t.id} className={cn('bg-navy-mid border rounded-lg px-4 py-3 shadow-xl animate-fade-in flex items-start gap-3', styles[t.type])}>
          {icons[t.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{t.title}</p>
            {t.message && <p className="text-xs text-slate mt-0.5">{t.message}</p>}
          </div>
          <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-slate hover:text-white transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
