'use client'

import { cn, formatCurrency, getInventoryStatusColor } from '@/lib/utils'
import { Inventory } from '@/types'
import { Building2, Layers, Home, Compass } from 'lucide-react'
import Link from 'next/link'

// ─── Status color map for heatmap cells ─────────────────
const HEATMAP_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-900/70 border-green-700/40 hover:bg-green-700/60 hover:border-green-500/60',
  BLOCKED:   'bg-orange-900/70 border-orange-700/40 hover:bg-orange-700/60 hover:border-orange-500/60',
  SOLD:      'bg-blue-900/70 border-blue-700/40 hover:bg-blue-700/60 hover:border-blue-500/60',
  RESERVED:  'bg-red-900/70 border-red-700/40 hover:bg-red-700/60 hover:border-red-500/60',
}

// ─── Heatmap Cell ────────────────────────────────────────
interface HeatmapCellProps {
  unit: Inventory
  onClick?: (unit: Inventory) => void
  size?: 'sm' | 'md'
}

export function HeatmapCell({ unit, onClick, size = 'md' }: HeatmapCellProps) {
  return (
    <button
      onClick={() => onClick?.(unit)}
      title={`${unit.unitNumber} — ${unit.status} — ${unit.area} sq.ft @ ${formatCurrency(unit.baseRate * unit.area)}`}
      className={cn(
        'border rounded flex items-center justify-center font-medium transition-all duration-150 hover:scale-110 hover:z-10 relative',
        size === 'sm' ? 'w-10 h-8 text-[8px]' : 'w-14 h-10 text-[9px]',
        'text-white/70',
        HEATMAP_COLORS[unit.status] || 'bg-navy-light border-navy-border'
      )}
    >
      {unit.unitNumber}
    </button>
  )
}

// ─── Heatmap Legend ──────────────────────────────────────
export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-5 flex-wrap">
      {[
        { status: 'AVAILABLE', color: 'bg-green-700', label: 'Available' },
        { status: 'BLOCKED',   color: 'bg-orange-700', label: 'Blocked' },
        { status: 'SOLD',      color: 'bg-blue-700', label: 'Sold' },
        { status: 'RESERVED',  color: 'bg-red-700', label: 'Reserved' },
      ].map(item => (
        <div key={item.status} className="flex items-center gap-2 text-xs text-slate">
          <div className={cn('w-3 h-3 rounded', item.color)} />
          {item.label}
        </div>
      ))}
    </div>
  )
}

// ─── Unit Summary Card ───────────────────────────────────
interface UnitCardProps {
  unit: Inventory
  onClick?: () => void
}

export function UnitCard({ unit, onClick }: UnitCardProps) {
  const content = (
    <div
      onClick={onClick}
      className="bg-navy-mid border border-navy-border rounded-xl p-4 hover:border-gold/30 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-navy border border-navy-border flex items-center justify-center">
            <Building2 className="w-4 h-4 text-gold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Unit {unit.unitNumber}</p>
            {unit.tower && <p className="text-[10px] text-slate">{unit.tower}</p>}
          </div>
        </div>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', getInventoryStatusColor(unit.status))}>
          {unit.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { icon: Layers, label: 'Floor', value: unit.floor ? `Floor ${unit.floor}` : '—' },
          { icon: Home, label: 'Area', value: `${unit.area} sq.ft` },
          { icon: Compass, label: 'Facing', value: unit.facing || '—' },
          { icon: Building2, label: 'Type', value: unit.propertyType },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <item.icon className="w-3 h-3 text-slate flex-shrink-0" />
            <span className="text-[10px] text-slate">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-navy-border/50">
        <div>
          <p className="text-[9px] text-slate">Rate / sq.ft</p>
          <p className="text-xs font-medium text-slate-light">₹{unit.baseRate?.toLocaleString('en-IN')}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate">Total Value</p>
          <p className="text-sm font-semibold text-gold">{formatCurrency(unit.area * unit.baseRate)}</p>
        </div>
      </div>
    </div>
  )

  if (!onClick) return <Link href={`/inventory/${unit.id}`}>{content}</Link>
  return content
}

// ─── Inventory Stats Strip ───────────────────────────────
interface InventoryStatsProps {
  available: number
  blocked: number
  sold: number
  reserved: number
  onFilter?: (status: string) => void
  activeFilter?: string
}

export function InventoryStats({ available, blocked, sold, reserved, onFilter, activeFilter }: InventoryStatsProps) {
  const total = available + blocked + sold + reserved

  const items = [
    { status: 'AVAILABLE', label: 'Available', count: available, color: 'text-green-400', border: 'border-green-500/20', bg: 'bg-green-500/5', activeBg: 'bg-green-500/15 border-green-500/40' },
    { status: 'BLOCKED',   label: 'Blocked',   count: blocked,   color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/5', activeBg: 'bg-orange-500/15 border-orange-500/40' },
    { status: 'SOLD',      label: 'Sold',      count: sold,      color: 'text-blue-400',   border: 'border-blue-500/20',   bg: 'bg-blue-500/5',   activeBg: 'bg-blue-500/15 border-blue-500/40' },
    { status: 'RESERVED',  label: 'Reserved',  count: reserved,  color: 'text-red-400',    border: 'border-red-500/20',    bg: 'bg-red-500/5',    activeBg: 'bg-red-500/15 border-red-500/40' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(item => (
        <button
          key={item.status}
          onClick={() => onFilter?.(activeFilter === item.status ? '' : item.status)}
          className={cn(
            'rounded-xl p-4 border text-center transition-all',
            activeFilter === item.status
              ? item.activeBg
              : `${item.border} ${item.bg} hover:border-slate/30`
          )}
        >
          <p className={cn('text-2xl font-display font-semibold', item.color)}>{item.count}</p>
          <p className="text-[10px] text-slate mt-1">{item.label}</p>
          {total > 0 && (
            <p className={cn('text-[9px] mt-0.5', item.color, 'opacity-70')}>
              {Math.round((item.count / total) * 100)}%
            </p>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Tower Selector ──────────────────────────────────────
interface TowerSelectorProps {
  towers: string[]
  selected: string
  onChange: (tower: string) => void
}

export function TowerSelector({ towers, selected, onChange }: TowerSelectorProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      <button
        onClick={() => onChange('')}
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
          !selected ? 'bg-gold/20 text-gold border-gold/40' : 'bg-navy-mid border-navy-border text-slate hover:text-white'
        )}
      >
        All Towers
      </button>
      {towers.map(tower => (
        <button
          key={tower}
          onClick={() => onChange(tower)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            selected === tower ? 'bg-gold/20 text-gold border-gold/40' : 'bg-navy-mid border-navy-border text-slate hover:text-white'
          )}
        >
          {tower}
        </button>
      ))}
    </div>
  )
}
