'use client'

import { useState, useRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button, Modal } from '@/components/ui/index'
import { Upload, X, File, Image, AlertTriangle, Check } from 'lucide-react'

// ─── Confirm Dialog ───────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'default'
  loading?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', variant = 'default', loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className={cn('flex items-start gap-3 p-3 rounded-lg', variant === 'danger' ? 'bg-red-500/10 border border-red-500/20' : 'bg-navy border border-navy-border')}>
          {variant === 'danger' && <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
          <p className="text-sm text-slate-light leading-relaxed">{description}</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={onConfirm}
            loading={loading}
            variant={variant === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
          <Button onClick={onClose} variant="ghost" className="flex-1">Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── File Upload Zone ─────────────────────────────────────
interface FileUploadZoneProps {
  onFile: (file: File) => void
  accept?: string
  maxSizeMB?: number
  label?: string
  loading?: boolean
}

export function FileUploadZone({ onFile, accept = '*', maxSizeMB = 10, label = 'Click to upload or drag & drop', loading }: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setError('')
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB}MB.`)
      return
    }
    onFile(file)
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          dragging ? 'border-gold bg-gold/10' : 'border-navy-border hover:border-gold/40 hover:bg-navy-light/20',
          loading && 'opacity-60 pointer-events-none'
        )}
      >
        <Upload className={cn('w-8 h-8 mx-auto mb-3', dragging ? 'text-gold' : 'text-slate')} />
        <p className="text-sm text-slate-light mb-1">{label}</p>
        <p className="text-[11px] text-slate">PDF, JPG, PNG, DOCX — Max {maxSizeMB}MB</p>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1.5">{error}</p>}
    </div>
  )
}

// ─── Document List Item ───────────────────────────────────
interface DocumentItemProps {
  name: string
  category: string
  url: string
  date?: string
  onDelete?: () => void
}

export function DocumentItem({ name, category, url, date, onDelete }: DocumentItemProps) {
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
  const isPdf = /\.pdf$/i.test(url)

  return (
    <div className="flex items-center gap-3 p-3 bg-navy rounded-lg border border-navy-border hover:border-gold/25 transition-colors group">
      <div className="w-8 h-8 rounded-lg bg-navy-light border border-navy-border flex items-center justify-center flex-shrink-0">
        {isImage ? <Image className="w-4 h-4 text-blue-400" /> : <File className="w-4 h-4 text-gold" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] px-1.5 py-0 rounded-full bg-navy-light text-slate border border-navy-border">{category}</span>
          {date && <span className="text-[10px] text-slate">{date}</span>}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <button className="text-[11px] text-gold hover:text-gold-light px-2 py-1 rounded hover:bg-gold/10 transition-colors">View</button>
        </a>
        {onDelete && (
          <button onClick={onDelete} className="p-1 text-slate hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────
interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}

export function EmptyStateIllustration({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-16')}>
      {icon && (
        <div className="text-slate/20 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-navy border border-navy-border flex items-center justify-center mx-auto">
            {icon}
          </div>
        </div>
      )}
      <p className="text-sm font-medium text-slate-light mb-1.5">{title}</p>
      {description && <p className="text-xs text-slate max-w-xs leading-relaxed mb-4">{description}</p>}
      {action}
    </div>
  )
}

// ─── Phone Input with country code ─────────────────────────
interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  error?: string
  label?: string
}

export function PhoneInput({ value, onChange, placeholder = '9876543210', className, error, label }: PhoneInputProps) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-slate-light mb-1.5">{label}</label>}
      <div className="flex">
        <div className="flex items-center px-3 bg-navy border border-r-0 border-navy-border rounded-l-lg text-sm text-slate flex-shrink-0">
          +91
        </div>
        <input
          value={value?.replace(/^\+91\s?/, '') || ''}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          maxLength={10}
          className={cn(
            'flex-1 bg-navy border border-navy-border rounded-r-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50',
            error && 'border-red-500/50',
            className
          )}
        />
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  )
}

// ─── Success Toast State ──────────────────────────────────
export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-lg px-4 py-3 text-sm text-green-400">
      <Check className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  )
}

// ─── Loading Skeleton ────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-navy-light rounded', className)} />
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
