import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toLocaleString('en-IN')}`
}

export const formatCurrencyFull = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatDateTime = (date: string | Date) => {
  return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const formatRelativeTime = (date: string | Date) => {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export const getLeadStatusColor = (status: string) => {
  const map: Record<string, string> = {
    NEW: 'status-new',
    FOLLOWUP: 'status-followup',
    INTERESTED: 'status-interested',
    QUALIFIED: 'status-qualified',
    SITE_VISIT_FIXED: 'status-site-visit',
    SITE_VISIT_DONE: 'status-site-visit',
    OPPORTUNITY: 'status-opportunity',
    OPPORTUNITY_FOLLOW: 'status-opportunity',
    OPPORTUNITY_INTERESTED: 'status-opportunity',
    OPPORTUNITY_NOT_INTERESTED: 'status-closed',
    OPPORTUNITY_CLOSED: 'status-closed',
    BOOKED: 'status-booked',
  }
  return map[status] || 'status-new'
}

export const getLeadStatusLabel = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export const getSourceLabel = (source: string) => {
  const map: Record<string, string> = {
    MAGICBRICKS: 'MagicBricks',
    FACEBOOK: 'Facebook',
    META_ADS: 'Meta Ads',
    GOOGLE_ADS: 'Google Ads',
    ACRES_99: '99acres',
    WEBSITE: 'Website',
    DIRECT_CALL: 'Direct Call',
    WALK_IN: 'Walk-in',
    REFERRAL: 'Referral',
    WHATSAPP: 'WhatsApp',
  }
  return map[source] || source
}

export const getInventoryStatusColor = (status: string) => {
  const map: Record<string, string> = {
    AVAILABLE: 'text-green-400 bg-green-500/10 border-green-500/30',
    BLOCKED: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    SOLD: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    RESERVED: 'text-red-400 bg-red-500/10 border-red-500/30',
  }
  return map[status] || ''
}

export const LEAD_STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'FOLLOWUP', label: 'Followup' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'SITE_VISIT_FIXED', label: 'Site Visit Fixed' },
  { value: 'SITE_VISIT_DONE', label: 'Site Visit Done' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'OPPORTUNITY_FOLLOW', label: 'Opportunity Follow' },
  { value: 'OPPORTUNITY_INTERESTED', label: 'Opportunity Interested' },
  { value: 'OPPORTUNITY_NOT_INTERESTED', label: 'Opportunity Not Interested' },
  { value: 'OPPORTUNITY_CLOSED', label: 'Opportunity Closed' },
  { value: 'BOOKED', label: 'Booked' },
]

export const LEAD_SOURCES = [
  { value: 'MAGICBRICKS', label: 'MagicBricks' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'META_ADS', label: 'Meta Ads' },
  { value: 'GOOGLE_ADS', label: 'Google Ads' },
  { value: 'ACRES_99', label: '99acres' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'DIRECT_CALL', label: 'Direct Call' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
]

export const PROPERTY_TYPES = [
  { value: 'VILLA', label: 'Villa' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'PLOT', label: 'Plot' },
  { value: 'FARMLAND', label: 'Farm Land' },
  { value: 'COMMERCIAL', label: 'Commercial' },
]

export const USER_ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SALES_MANAGER', label: 'Sales Manager' },
  { value: 'SALES_EXECUTIVE', label: 'Sales Executive' },
  { value: 'TELECALLER', label: 'Telecaller' },
  { value: 'ACCOUNTS', label: 'Accounts' },
  { value: 'CRM_TEAM', label: 'CRM Team' },
  { value: 'POST_SALES', label: 'Post Sales' },
]
