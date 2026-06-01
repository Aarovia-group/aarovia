'use client'

import { ReactNode } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// ─── Metric Card ────────────────────────────────────────
interface MetricCardProps {
  label: string
  value: string | number
  subValue?: string
  trend?: { direction: 'up' | 'down'; value: string }
  accentColor?: 'gold' | 'green' | 'blue' | 'orange' | 'red'
  icon?: ReactNode
  onClick?: () => void
  className?: string
}

const ACCENT_GRADIENTS: Record<string, string> = {
  gold: 'from-gold to-gold-light',
  green: 'from-green-500 to-emerald-400',
  blue: 'from-blue-500 to-cyan-400',
  orange: 'from-orange-500 to-amber-400',
  red: 'from-red-500 to-rose-400',
}

export function MetricCard({ label, value, subValue, trend, accentColor = 'gold', icon, onClick, className }: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-navy-mid border border-navy-border rounded-xl p-4 relative overflow-hidden transition-all duration-200',
        onClick && 'cursor-pointer hover:border-gold/30 hover:-translate-y-0.5',
        className
      )}
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${ACCENT_GRADIENTS[accentColor]}`} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10.5px] text-slate uppercase tracking-wide font-medium">{label}</p>
        {icon && <div className="text-slate">{icon}</div>}
      </div>
      <div className="font-display text-2xl font-medium text-white mb-1">{value}</div>
      <div className="flex items-center gap-2 text-[10.5px]">
        {trend && (
          <span className={cn('flex items-center gap-0.5', trend.direction === 'up' ? 'text-green-400' : 'text-red-400')}>
            {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}
          </span>
        )}
        {subValue && <span className="text-slate">{subValue}</span>}
      </div>
    </div>
  )
}

// ─── Revenue Chart ────────────────────────────────────────
interface RevenueChartProps {
  data: Array<{ month: string; revenue: number; transactions?: number }>
  height?: number
}

export function RevenueChart({ data, height = 200 }: RevenueChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-navy-mid border border-navy-border rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="text-slate mb-1">{label}</p>
        <p className="text-gold font-semibold">{formatCurrency(payload[0]?.value || 0)}</p>
        {payload[1] && <p className="text-slate-light">{payload[1].value} txns</p>}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="month" tick={{ fill: '#8BA3C4', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#8BA3C4', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} width={70} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#C9A84C"
          strokeWidth={2.5}
          dot={{ fill: '#C9A84C', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#E8C96A' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Bar Chart ────────────────────────────────────────
interface SimpleBarChartProps {
  data: Array<Record<string, any>>
  dataKey: string
  xKey?: string
  colors?: string[]
  height?: number
  formatter?: (v: number) => string
}

export function SimpleBarChart({ data, dataKey, xKey = 'name', colors, height = 200, formatter }: SimpleBarChartProps) {
  const COLORS = colors || ['#C9A84C', '#3498DB', '#2ECC71', '#E67E22', '#9B59B6']

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-navy-mid border border-navy-border rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="text-slate mb-1">{label}</p>
        <p className="text-gold font-semibold">{formatter ? formatter(payload[0]?.value) : payload[0]?.value}</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey={xKey} tick={{ fill: '#8BA3C4', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#8BA3C4', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Activity Feed ────────────────────────────────────────
interface ActivityItem {
  id: string
  type: string
  description: string
  createdAt: string
  user?: { name: string }
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  maxItems?: number
}

const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  LEAD_CREATED: { icon: '👤', color: 'text-green-400', bg: 'bg-green-500/15' },
  STATUS_CHANGED: { icon: '🔄', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  CALL_LOGGED: { icon: '📞', color: 'text-orange-400', bg: 'bg-orange-500/15' },
  EMAIL_SENT: { icon: '📧', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  WHATSAPP_SENT: { icon: '💬', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  NOTE_ADDED: { icon: '📝', color: 'text-purple-400', bg: 'bg-purple-500/15' },
  LEAD_ASSIGNED: { icon: '👋', color: 'text-gold', bg: 'bg-gold/15' },
  BOOKING_CREATED: { icon: '🎉', color: 'text-gold', bg: 'bg-gold/15' },
  SITE_VISIT: { icon: '📍', color: 'text-orange-400', bg: 'bg-orange-500/15' },
}

export function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
  const items = activities.slice(0, maxItems)

  if (!items.length) {
    return <p className="text-sm text-slate text-center py-8">No recent activity</p>
  }

  return (
    <div className="space-y-0">
      {items.map((act, i) => {
        const config = TYPE_ICONS[act.type] || { icon: '●', color: 'text-slate', bg: 'bg-navy-light' }
        const isLast = i === items.length - 1
        return (
          <div key={act.id} className="flex gap-3 pb-4 relative">
            {!isLast && <div className="absolute left-[13px] top-7 bottom-0 w-px bg-navy-border" />}
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs', config.bg)}>
              {config.icon}
            </div>
            <div className="flex-1 pt-0.5 min-w-0">
              <p className="text-xs text-slate-light leading-relaxed">{act.description}</p>
              <div className="flex items-center gap-2 mt-1">
                {act.user && <span className="text-[10px] text-slate">{act.user.name}</span>}
                <span className="text-[10px] text-slate/60">
                  {new Date(act.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Collection Progress Bar ────────────────────────────────────────
interface CollectionProgressProps {
  total: number
  collected: number
  due: number
  showLabels?: boolean
}

export function CollectionProgress({ total, collected, due, showLabels = true }: CollectionProgressProps) {
  const pct = total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0
  const color = pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  const textColor = pct >= 75 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div>
      {showLabels && (
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate">Collection Progress</span>
          <span className={textColor}>{pct}%</span>
        </div>
      )}
      <div className="h-2 bg-navy rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
      {showLabels && (
        <div className="flex justify-between text-[10px] text-slate mt-1.5">
          <span>Collected: {formatCurrency(collected)}</span>
          {due > 0 && <span className="text-red-400/80">Due: {formatCurrency(due)}</span>}
        </div>
      )}
    </div>
  )
}
