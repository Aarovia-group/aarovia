'use client'

import { cn, formatCurrency, formatRelativeTime, getLeadStatusColor, getLeadStatusLabel, getSourceLabel } from '@/lib/utils'
import { Lead, Activity, CallLog } from '@/types'
import { Phone, MessageSquare, Mail, MapPin, Calendar, User } from 'lucide-react'
import Link from 'next/link'

// ─── Status Badge ─────────────────────────────────────────
export function LeadStatusBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium border',
      size === 'xs' ? 'text-[9px] px-1.5 py-0' : 'text-[10px] px-2 py-0.5',
      getLeadStatusColor(status)
    )}>
      {getLeadStatusLabel(status)}
    </span>
  )
}

// ─── Source Badge ─────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  FACEBOOK: 'bg-blue-600/20 text-blue-400',
  MAGICBRICKS: 'bg-orange-500/20 text-orange-400',
  ACRES_99: 'bg-green-500/20 text-green-400',
  WEBSITE: 'bg-purple-500/20 text-purple-400',
  DIRECT_CALL: 'bg-cyan-500/20 text-cyan-400',
  WALK_IN: 'bg-pink-500/20 text-pink-400',
  REFERRAL: 'bg-gold/20 text-gold',
  WHATSAPP: 'bg-emerald-500/20 text-emerald-400',
}

export function LeadSourceBadge({ source }: { source: string }) {
  return (
    <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-medium', SOURCE_COLORS[source] || 'bg-slate/20 text-slate')}>
      {getSourceLabel(source)}
    </span>
  )
}

// ─── Lead Card (for pipeline view) ─────────────────────────
interface LeadCardProps {
  lead: Lead
  compact?: boolean
  onClick?: () => void
}

export function LeadCard({ lead, compact = false, onClick }: LeadCardProps) {
  const content = (
    <div className={cn(
      'bg-navy-mid border border-navy-border rounded-lg transition-all cursor-pointer',
      compact ? 'p-2.5' : 'p-3',
      'hover:border-gold/30 hover:bg-navy-light/30'
    )}>
      <div className="flex items-start justify-between mb-1.5">
        <p className={cn('font-medium text-white truncate', compact ? 'text-xs' : 'text-sm')}>{lead.name}</p>
        <LeadStatusBadge status={lead.status} size="xs" />
      </div>
      <div className="flex items-center gap-1 mb-1.5">
        <Phone className="w-3 h-3 text-slate flex-shrink-0" />
        <span className="text-[10px] text-slate truncate">{lead.mobile}</span>
      </div>
      {lead.budget && (
        <p className="text-xs text-gold font-medium mb-1">{formatCurrency(lead.budget)}</p>
      )}
      <div className="flex items-center justify-between">
        <LeadSourceBadge source={lead.source} />
        <span className="text-[9px] text-slate">{formatRelativeTime(lead.updatedAt)}</span>
      </div>
    </div>
  )

  if (onClick) return <div onClick={onClick}>{content}</div>
  return <Link href={`/leads/${lead.id}`}>{content}</Link>
}

// ─── Lead Row (for table view) ─────────────────────────────
interface LeadRowProps {
  lead: Lead
  onStatusUpdate?: (id: string, status: string) => void
  onDelete?: (id: string) => void
}

export function LeadRow({ lead }: LeadRowProps) {
  return (
    <tr className="hover:bg-navy-light/30 transition-colors border-b border-navy-border/50">
      <td className="py-3 px-3">
        <Link href={`/leads/${lead.id}`} className="group">
          <p className="text-sm font-medium text-white group-hover:text-gold transition-colors">{lead.name}</p>
          {lead.email && <p className="text-[10px] text-slate mt-0.5">{lead.email}</p>}
          {lead.city && <p className="text-[10px] text-slate">{lead.city}</p>}
        </Link>
      </td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-1">
          <span className="text-sm text-white">{lead.mobile}</span>
          <a href={`tel:${lead.mobile}`} className="text-blue-400 hover:text-blue-300 ml-1 p-0.5" title="Call">
            <Phone className="w-3 h-3" />
          </a>
          <a href={`https://wa.me/${lead.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 p-0.5" title="WhatsApp">
            <MessageSquare className="w-3 h-3" />
          </a>
        </div>
      </td>
      <td className="py-3 px-3 text-gold font-medium text-sm">
        {lead.budget ? formatCurrency(lead.budget) : '—'}
      </td>
      <td className="py-3 px-3">
        <LeadSourceBadge source={lead.source} />
      </td>
      <td className="py-3 px-3">
        <LeadStatusBadge status={lead.status} />
      </td>
      <td className="py-3 px-3 text-xs text-slate">
        {lead.assignedTo?.name || '—'}
      </td>
      <td className="py-3 px-3 text-xs">
        {lead.nextFollowupDate ? (
          <span className={cn(
            new Date(lead.nextFollowupDate) < new Date() ? 'text-red-400' : 'text-slate-light'
          )}>
            {new Date(lead.nextFollowupDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        ) : <span className="text-slate">—</span>}
      </td>
    </tr>
  )
}

// ─── Call Log Item ─────────────────────────────────────────
export function CallLogItem({ callLog }: { callLog: CallLog }) {
  const outcomeColor: Record<string, string> = {
    'Connected': 'text-green-400',
    'Not Answered': 'text-red-400',
    'Busy': 'text-yellow-400',
    'Interested': 'text-gold',
    'Not Interested': 'text-red-400/70',
  }

  return (
    <div className="flex gap-3 p-3 bg-navy rounded-lg border border-navy-border">
      <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
        <Phone className="w-3.5 h-3.5 text-orange-400" />
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className={cn('text-xs font-medium', outcomeColor[callLog.outcome || ''] || 'text-white')}>
            {callLog.outcome || 'Call Logged'}
          </span>
          <span className="text-[10px] text-slate flex-shrink-0">{formatRelativeTime(callLog.calledAt)}</span>
        </div>
        {callLog.notes && <p className="text-xs text-slate mt-1 leading-relaxed">{callLog.notes}</p>}
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate">
          {callLog.user && <span>By: {callLog.user.name}</span>}
          {callLog.duration && <span>Duration: {callLog.duration}s</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Followup Indicator ─────────────────────────────────────
export function FollowupIndicator({ date }: { date: string | null | undefined }) {
  if (!date) return <span className="text-slate text-xs">—</span>

  const d = new Date(date)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  let color = 'text-slate-light'
  let label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

  if (days < 0) { color = 'text-red-400'; label = `Overdue (${Math.abs(days)}d)` }
  else if (days === 0) { color = 'text-yellow-400'; label = 'Today' }
  else if (days === 1) { color = 'text-orange-400'; label = 'Tomorrow' }
  else if (days <= 3) { color = 'text-orange-400/70'; label = `In ${days} days` }

  return (
    <div className={cn('flex items-center gap-1 text-xs', color)}>
      <Calendar className="w-3 h-3" />
      {label}
    </div>
  )
}
