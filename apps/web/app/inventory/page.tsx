'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, Table, Tr, Td, SearchInput, Modal, EmptyState } from '@/components/ui/index'
import { inventoryApi, projectApi } from '@/lib/api'
import { formatCurrency, getInventoryStatusColor } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Plus, Grid3x3, List, Home, Building2, Eye } from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-900/60 border-green-700/40 hover:bg-green-800/60',
  BLOCKED: 'bg-orange-900/60 border-orange-700/40 hover:bg-orange-800/60',
  SOLD: 'bg-blue-900/60 border-blue-700/40 hover:bg-blue-800/60',
  RESERVED: 'bg-red-900/60 border-red-700/40 hover:bg-red-800/60',
}

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'list' | 'heatmap'>('list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, statusFilter],
    queryFn: () => inventoryApi.getAll({ search: search || undefined, status: statusFilter || undefined, limit: 100 }),
  })

  const { data: projectData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => inventoryApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); setShowCreate(false); toast.success('Unit created') },
    onError: () => toast.error('Failed to create unit'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => inventoryApi.updateStatus(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); setSelectedUnit(null); toast.success('Status updated') },
  })

  const inventory = data?.data?.data || []
  const projects = projectData?.data?.data || []

  const summary = {
    available: inventory.filter((i: any) => i.status === 'AVAILABLE').length,
    blocked: inventory.filter((i: any) => i.status === 'BLOCKED').length,
    sold: inventory.filter((i: any) => i.status === 'SOLD').length,
    reserved: inventory.filter((i: any) => i.status === 'RESERVED').length,
  }

  const { register, handleSubmit, reset } = useForm()

  return (
    <AppLayout
      title="Inventory Management"
      subtitle={`${inventory.length} total units`}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>Add Unit</Button>
        </div>
      }
    >
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Available', count: summary.available, color: 'text-green-400', dot: 'bg-green-500' },
          { label: 'Blocked', count: summary.blocked, color: 'text-orange-400', dot: 'bg-orange-500' },
          { label: 'Sold', count: summary.sold, color: 'text-blue-400', dot: 'bg-blue-500' },
          { label: 'Reserved', count: summary.reserved, color: 'text-red-400', dot: 'bg-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-navy-mid border border-navy-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-display font-medium ${s.color} mb-1`}>{s.count}</div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate">
              <div className={`w-2 h-2 rounded-sm ${s.dot}`} />{s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filters & View Toggle */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-0 sm:min-w-[180px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by unit, tower..." />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-navy-mid border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
        >
          <option value="">All Status</option>
          {['AVAILABLE', 'BLOCKED', 'SOLD', 'RESERVED'].map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
        <div className="flex bg-navy-mid border border-navy-border rounded-lg overflow-hidden">
          <button onClick={() => setView('list')} className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-gold/20 text-gold' : 'text-slate hover:text-white'}`}><List className="w-3.5 h-3.5" />List</button>
          <button onClick={() => setView('heatmap')} className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${view === 'heatmap' ? 'bg-gold/20 text-gold' : 'text-slate hover:text-white'}`}><Grid3x3 className="w-3.5 h-3.5" />Heatmap</button>
        </div>
      </div>

      {view === 'list' ? (
        <Card>
          <Table headers={['Unit', 'Tower', 'Floor', 'Area', 'Base Rate', 'Total Value', 'Type', 'Status', 'Customer', 'Actions']}>
            {isLoading ? (
              <tr><td colSpan={10} className="py-12 text-center text-slate text-sm">Loading inventory...</td></tr>
            ) : inventory.length === 0 ? (
              <tr><td colSpan={10}><EmptyState icon={<Building2 className="w-10 h-10" />} title="No units found" description="Add inventory units to get started." /></td></tr>
            ) : inventory.map((unit: any) => (
              <Tr key={unit.id}>
                <Td className="font-medium text-white">{unit.unitNumber}</Td>
                <Td>{unit.tower || '—'}</Td>
                <Td>{unit.floor || '—'}</Td>
                <Td>{unit.area} sq.ft</Td>
                <Td className="text-gold">₹{unit.baseRate?.toLocaleString('en-IN')}/sq.ft</Td>
                <Td className="text-gold font-medium">{formatCurrency(unit.area * unit.baseRate)}</Td>
                <Td className="text-slate text-xs">{unit.propertyType}</Td>
                <Td>
                  <button
                    onClick={() => setSelectedUnit(unit)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getInventoryStatusColor(unit.status)}`}
                  >
                    {unit.status}
                  </button>
                </Td>
                <Td>{unit.customer?.name || <span className="text-slate">—</span>}</Td>
                <Td>
                  <button className="p-1.5 text-slate hover:text-white hover:bg-navy-light rounded transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </Td>
              </Tr>
            ))}
          </Table>
        </Card>
      ) : (
        /* Heatmap View */
        <Card>
          <CardHeader>
            <CardTitle><Grid3x3 className="w-4 h-4 text-gold" />Inventory Heatmap</CardTitle>
            <div className="flex items-center gap-4">
              {[{ label: 'Available', color: 'bg-green-700' }, { label: 'Blocked', color: 'bg-orange-700' }, { label: 'Sold', color: 'bg-blue-700' }, { label: 'Reserved', color: 'bg-red-700' }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-slate">
                  <div className={`w-3 h-3 rounded ${l.color}`} />{l.label}
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {inventory.map((unit: any) => (
                <button
                  key={unit.id}
                  onClick={() => setSelectedUnit(unit)}
                  title={`${unit.unitNumber} - ${unit.status} - ${unit.area} sq.ft`}
                  className={`w-14 h-10 rounded border text-[9px] font-medium text-white/70 transition-all hover:scale-105 ${STATUS_COLORS[unit.status] || 'bg-navy-light border-navy-border'}`}
                >
                  {unit.unitNumber}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unit Detail Modal */}
      {selectedUnit && (
        <Modal open={!!selectedUnit} onClose={() => setSelectedUnit(null)} title={`Unit ${selectedUnit.unitNumber}`} size="sm">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ['Tower', selectedUnit.tower || '—'],
                ['Floor', selectedUnit.floor || '—'],
                ['Area', `${selectedUnit.area} sq.ft`],
                ['Base Rate', `₹${selectedUnit.baseRate?.toLocaleString('en-IN')}/sq.ft`],
                ['Total Value', formatCurrency(selectedUnit.area * selectedUnit.baseRate)],
                ['Facing', selectedUnit.facing || '—'],
                ['Type', selectedUnit.propertyType],
                ['Bedrooms', selectedUnit.bedrooms || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <span className="text-[10px] text-slate block">{k}</span>
                  <span className="text-slate-light">{v}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-light mb-2">Change Status</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['AVAILABLE', 'BLOCKED', 'RESERVED', 'SOLD'].map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatusMutation.mutate({ id: selectedUnit.id, status: s })}
                    disabled={selectedUnit.status === s}
                    className={`py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${selectedUnit.status === s ? 'bg-gold/20 text-gold border-gold/40' : 'bg-navy border-navy-border text-slate hover:text-white hover:border-slate'}`}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Unit Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset() }} title="Add Inventory Unit" size="lg">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Project *</label>
              <select {...register('projectId', { required: true })} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                <option value="">Select project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Unit Number *</label>
              <input {...register('unitNumber', { required: true })} placeholder="e.g. A-101" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Tower</label>
              <input {...register('tower')} placeholder="Tower A" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Floor</label>
              <input {...register('floor')} type="number" placeholder="Floor number" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Area (sq.ft) *</label>
              <input {...register('area', { required: true })} type="number" placeholder="Area in sq.ft" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Base Rate (₹/sq.ft) *</label>
              <input {...register('baseRate', { required: true })} type="number" placeholder="Rate per sq.ft" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Property Type *</label>
              <select {...register('propertyType', { required: true })} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                <option value="">Select type</option>
                {['VILLA', 'APARTMENT', 'PLOT', 'FARMLAND', 'COMMERCIAL'].map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Facing</label>
              <select {...register('facing')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                <option value="">Select facing</option>
                {['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={createMutation.isPending} className="flex-1">Create Unit</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); reset() }}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
