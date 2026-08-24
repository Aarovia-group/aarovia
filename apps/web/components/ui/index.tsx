'use client'

import { forwardRef, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { X, Loader2 } from 'lucide-react'

// Button
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-gold text-white font-semibold hover:bg-gold-light active:bg-gold-dark',
      secondary: 'bg-amber-50 text-gold border border-amber-200 hover:bg-amber-100 hover:border-amber-300',
      ghost: 'text-slate-light hover:text-foreground hover:bg-slate-100',
      danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
      success: 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20',
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
      md: 'px-4 py-2 text-sm rounded-lg gap-2',
      lg: 'px-5 py-2.5 text-sm rounded-lg gap-2',
    }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-150 font-medium disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant], sizes[size], className
        )}
        {...props}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// Card
export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-white border border-[#e3e9ef] rounded-lg shadow-[0_1px_2px_rgba(31,41,55,0.03)]', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 py-3.5 border-b border-[#e8edf2] flex items-center justify-between', className)} {...props}>{children}</div>
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold text-[#172033] flex items-center gap-2', className)} {...props}>{children}</h3>
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props}>{children}</div>
}

// Badge
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-slate-light border border-slate-200',
    success: 'bg-green-500/15 text-green-400 border border-green-500/25',
    warning: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
    danger: 'bg-red-500/15 text-red-400 border border-red-500/25',
    info: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
    gold: 'bg-gold/15 text-gold border border-gold/25',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', variants[variant], className)} {...props}>
      {children}
    </span>
  )
}

// Input
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label className="text-xs font-medium text-slate-light">{label}</label>}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate">{icon}</div>}
          <input
            ref={ref}
            className={cn(
              'w-full bg-white border border-[#d8e0e8] rounded-lg px-3 py-2 text-sm text-[#172033] placeholder:text-slate/50',
              'focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 transition-colors',
              icon && 'pl-9',
              error && 'border-red-500/50 focus:ring-red-500/30',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// Select
interface SelectProps {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Select({ label, error, options, value, onChange, placeholder, className, disabled }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-slate-light">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full bg-white border border-[#d8e0e8] rounded-lg px-3 py-2 text-sm text-[#172033]',
          'focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          !value && 'text-slate/50',
          error && 'border-red-500/50',
          className
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-white text-[#172033]">{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-slate-light">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          'w-full bg-white border border-[#d8e0e8] rounded-lg px-3 py-2 text-sm text-[#172033] placeholder:text-slate/50 resize-none',
          'focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 transition-colors',
          error && 'border-red-500/50',
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'

// Modal
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white border border-[#e3e9ef] rounded-lg shadow-2xl w-full mx-4', sizes[size])}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-border">
          <h2 className="font-display text-base font-medium text-white">{title}</h2>
          <button onClick={onClose} className="text-slate hover:text-white transition-colors p-1 rounded-md hover:bg-navy-light">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// Stats card
interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: 'up' | 'down'
  trendValue?: string
  icon?: ReactNode
  accentColor?: 'gold' | 'green' | 'blue' | 'orange' | 'red'
}

export function StatCard({ label, value, sub, trend, trendValue, icon, accentColor = 'gold' }: StatCardProps) {
  const accent = {
    gold: 'from-gold to-gold-light',
    green: 'from-green-500 to-emerald-400',
    blue: 'from-blue-500 to-cyan-400',
    orange: 'from-orange-500 to-amber-400',
    red: 'from-red-500 to-rose-400',
  }
  return (
    <div className="bg-navy-mid border border-navy-border rounded-xl p-4 relative overflow-hidden hover:border-gold/30 transition-colors card-glow-hover cursor-pointer">
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accent[accentColor]}`} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10.5px] text-slate uppercase tracking-wide font-medium">{label}</p>
        {icon && <div className="text-slate">{icon}</div>}
      </div>
      <div className="font-display text-2xl font-medium text-white mb-1">{value}</div>
      {(sub || trendValue) && (
        <div className="flex items-center gap-1.5 text-[10.5px]">
          {trendValue && (
            <span className={trend === 'up' ? 'text-green-400' : 'text-red-400'}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </span>
          )}
          {sub && <span className="text-slate">{sub}</span>}
        </div>
      )}
    </div>
  )
}

// Table
interface TableProps {
  headers: string[]
  children: ReactNode
  className?: string
}

export function Table({ headers, children, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-border">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-3 px-3 text-[10.5px] font-medium text-slate uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-border/50">{children}</tbody>
      </table>
    </div>
  )
}

export function Tr({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr
      className={cn('hover:bg-navy-light/30 transition-colors', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('py-3 px-3 text-sm text-slate-light', className)}>{children}</td>
}

// Empty state
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-slate/30 mb-4">{icon}</div>}
      <p className="text-sm font-medium text-slate-light mb-1">{title}</p>
      {description && <p className="text-xs text-slate mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// Loading spinner
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('w-5 h-5 animate-spin text-gold', className)} />
}

// Search input
export function SearchInput({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-navy border border-navy-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate/50 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 transition-colors"
      />
    </div>
  )
}

// Pagination
export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-navy-border">
      <p className="text-xs text-slate">Page {page} of {totalPages}</p>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  )
}
