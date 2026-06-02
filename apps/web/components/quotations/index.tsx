'use client'

import { cn, formatCurrency } from '@/lib/utils'
import { Quotation } from '@/types'
import { CheckCircle, Download, Mail, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/index'
import Link from 'next/link'

// ─── Quotation Summary Card ───────────────────────────────
interface QuotationSummaryProps {
  quotation: Quotation
  showActions?: boolean
  onEmail?: () => void
  onWhatsApp?: () => void
  onDownload?: () => void
}

export function QuotationSummary({ quotation: q, showActions, onEmail, onWhatsApp, onDownload }: QuotationSummaryProps) {
  const items = [
    { label: `Base Amount (${q.area} sq.ft × ₹${q.baseRate?.toLocaleString('en-IN')})`, value: q.baseAmount },
    ...(q.floorRise > 0 ? [{ label: 'Floor Rise', value: q.floorRise }] : []),
    ...(q.plcCharges > 0 ? [{ label: 'PLC Charges', value: q.plcCharges }] : []),
    ...(q.maintenanceCharges > 0 ? [{ label: 'Maintenance', value: q.maintenanceCharges }] : []),
    ...(q.parkingCharges > 0 ? [{ label: 'Parking', value: q.parkingCharges }] : []),
    ...(q.clubhouseCharges > 0 ? [{ label: 'Clubhouse', value: q.clubhouseCharges }] : []),
    ...(q.legalCharges > 0 ? [{ label: 'Legal Charges', value: q.legalCharges }] : []),
  ]

  return (
    <div className="bg-navy-mid border border-navy-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-navy-border bg-navy-light/20 flex justify-between items-center">
        <div>
          <p className="text-xs font-medium text-white">{q.quotationNumber}</p>
          <p className="text-[10px] text-slate mt-0.5">{q.propertyType} · {q.area} sq.ft</p>
        </div>
        <Link href={`/quotations/${q.id}`}>
          <Button variant="ghost" size="sm" className="text-xs">View →</Button>
        </Link>
      </div>

      {/* Breakdown */}
      <div className="p-4 space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex justify-between text-xs">
            <span className="text-slate">{item.label}</span>
            <span className="text-slate-light">{formatCurrency(item.value)}</span>
          </div>
        ))}
        {q.discount > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-slate">Discount</span>
            <span className="text-red-400">- {formatCurrency(q.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs pt-1 border-t border-navy-border/50">
          <span className="text-slate">GST ({q.gstRate}%)</span>
          <span className="text-slate-light">{formatCurrency(q.gstAmount)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-navy-border">
          <span className="text-sm font-semibold text-white">Total</span>
          <span className="text-lg font-display font-semibold text-gold">{formatCurrency(q.totalAmount)}</span>
        </div>
        {q.bookingAmount > 0 && (
          <div className="flex justify-between text-xs text-slate">
            <span>Booking Amount</span>
            <span className="text-green-400">{formatCurrency(q.bookingAmount)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="px-4 pb-4 flex gap-2">
          {onEmail && <Button variant="secondary" size="sm" icon={<Mail className="w-3.5 h-3.5" />} onClick={onEmail} className="flex-1">Email</Button>}
          {onWhatsApp && <Button variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />} onClick={onWhatsApp} className="flex-1">WA</Button>}
          {onDownload && <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={onDownload}>PDF</Button>}
        </div>
      )}
    </div>
  )
}

// ─── Live Calculation Display ─────────────────────────────
interface CalcDisplayProps {
  baseRate: number
  area: number
  charges: {
    floorRise?: number
    plcCharges?: number
    maintenanceCharges?: number
    parkingCharges?: number
    clubhouseCharges?: number
    legalCharges?: number
  }
  discount?: number
  gstRate?: number
  bookingAmount?: number
}

export function LiveCalculation({ baseRate, area, charges, discount = 0, gstRate = 5, bookingAmount = 0 }: CalcDisplayProps) {
  const baseAmount = (baseRate || 0) * (area || 0)
  const totalCharges = Object.values(charges).reduce((s, v) => s + (v || 0), 0)
  const subtotal = baseAmount + totalCharges - discount
  const gstAmount = subtotal * (gstRate / 100)
  const total = subtotal + gstAmount
  const balance = total - bookingAmount

  return (
    <div className="bg-navy rounded-xl border border-navy-border p-4">
      <p className="text-[10px] text-slate uppercase tracking-wide mb-3">Live Calculation</p>
      <div className="space-y-1.5 text-xs">
        {[
          { label: 'Base Amount', value: baseAmount },
          ...Object.entries(charges).filter(([, v]) => (v || 0) > 0).map(([k, v]) => ({
            label: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
            value: v || 0,
          })),
        ].map(item => (
          <div key={item.label} className="flex justify-between">
            <span className="text-slate">{item.label}</span>
            <span className="text-slate-light">{formatCurrency(item.value)}</span>
          </div>
        ))}
        {discount > 0 && (
          <div className="flex justify-between">
            <span className="text-slate">Discount</span>
            <span className="text-red-400">- {formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1.5 border-t border-navy-border/50">
          <span className="text-slate">GST ({gstRate}%)</span>
          <span className="text-slate-light">{formatCurrency(gstAmount)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-navy-border">
          <span className="font-semibold text-white">Total</span>
          <span className="text-base font-display font-semibold text-gold">{formatCurrency(total)}</span>
        </div>
        {bookingAmount > 0 && (
          <>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate">Booking Amount</span>
              <span className="text-green-400">{formatCurrency(bookingAmount)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate">Balance Due</span>
              <span className="text-orange-400">{formatCurrency(Math.max(0, balance))}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Status Flow Stepper ─────────────────────────────────
interface StatusStepperProps {
  steps: string[]
  currentStep: string
  labels?: Record<string, string>
}

export function StatusStepper({ steps, currentStep, labels = {} }: StatusStepperProps) {
  const currentIndex = steps.indexOf(currentStep)

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
              i < currentIndex ? 'border-gold bg-gold/25' : i === currentIndex ? 'border-gold bg-gold/15' : 'border-navy-border bg-navy'
            )}>
              {i < currentIndex
                ? <CheckCircle className="w-3.5 h-3.5 text-gold" />
                : <div className={cn('w-2 h-2 rounded-full', i === currentIndex ? 'bg-gold' : 'bg-navy-border')} />
              }
            </div>
            <span className={cn(
              'text-[9px] mt-1.5 text-center whitespace-normal font-medium',
              i === currentIndex ? 'text-gold' : i < currentIndex ? 'text-slate-light' : 'text-slate'
            )}>
              {labels[step] || step.charAt(0) + step.slice(1).toLowerCase().replace(/_/g, ' ')}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('flex-1 h-0.5 mx-2 mb-4', i < currentIndex ? 'bg-gold' : 'bg-navy-border')} />
          )}
        </div>
      ))}
    </div>
  )
}
