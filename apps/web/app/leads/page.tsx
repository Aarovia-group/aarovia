'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, Badge, Table, Tr, Td, SearchInput, Select, Pagination, EmptyState, Modal, Input, Textarea, StatCard } from '@/components/ui/index'
import { leadApi } from '@/lib/api'
import { formatCurrency, formatDate, formatRelativeTime, getLeadStatusColor, getLeadStatusLabel, getSourceLabel, LEAD_STATUSES, LEAD_SOURCES, PROPERTY_TYPES } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Plus, Download, Upload, Phone, Mail, MessageSquare, Users, LayoutList, Kanban, Filter, Eye, Edit2, Trash2, UserPlus, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'

export default function LeadsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'list' | 'pipeline'>('list')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, search, statusFilter, sourceFilter],
    queryFn: () => leadApi.getAll({ page, limit: 20, search: search || undefined, status: statusFilter || undefined, source: sourceFilter || undefined }),
  })

  const { data: pipelineData } = useQuery({
    queryKey: ['lead-pipeline'],
    queryFn: () => leadApi.getPipeline(),
    enabled: view === 'pipeline',
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => leadApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setShowCreate(false)
      toast.success('Lead created successfully')
    },
    onError: () => toast.error('Failed to create lead'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead deleted')
    },
  })

  const leads = data?.data?.data || []
  const meta = data?.data?.meta || {}
  const pipeline = pipelineData?.data?.data || []

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const onSubmit = (data: any) => createMutation.mutate(data)

  return (
    <AppLayout
      title="Lead Management"
      subtitle={`${meta.total || 0} total leads`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Upload className="w-3.5 h-3.5" />}>Import</Button>
          <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}>Export</Button>
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>Add Lead</Button>
        </div>
      }
    >
      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search leads by name, mobile, email..." />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="bg-navy-mid border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
        >
          <option value="">All Status</option>
          {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); setPage(1) }}
          className="bg-navy-mid border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
        >
          <option value="">All Sources</option>
          {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="flex bg-navy-mid border border-navy-border rounded-lg overflow-hidden">
          <button onClick={() => setView('list')} className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-gold/20 text-gold' : 'text-slate hover:text-white'}`}>
            <LayoutList className="w-3.5 h-3.5" />List
          </button>
          <button onClick={() => setView('pipeline')} className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${view === 'pipeline' ? 'bg-gold/20 text-gold' : 'text-slate hover:text-white'}`}>
            <Kanban className="w-3.5 h-3.5" />Pipeline
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <Card>
          <Table headers={['Lead', 'Mobile', 'Budget', 'Source', 'Status', 'Assigned To', 'Next Followup', 'Actions']}>
            {isLoading ? (
              <tr><td colSpan={8} className="py-12 text-center text-slate text-sm">Loading leads...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={8}><EmptyState icon={<Users className="w-10 h-10" />} title="No leads found" description="Start by adding your first lead or adjust your filters." /></td></tr>
            ) : leads.map((lead: any) => (
              <Tr key={lead.id}>
                <Td>
                  <div>
                    <Link href={`/leads/${lead.id}`} className="font-medium text-white hover:text-gold transition-colors">{lead.name}</Link>
                    {lead.email && <p className="text-[10px] text-slate">{lead.email}</p>}
                    {lead.city && <p className="text-[10px] text-slate">{lead.city}</p>}
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <span className="text-white">{lead.mobile}</span>
                    <a href={`tel:${lead.mobile}`} className="text-blue-400 hover:text-blue-300 ml-1"><Phone className="w-3 h-3" /></a>
                    <a href={`https://wa.me/${lead.mobile}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300"><MessageSquare className="w-3 h-3" /></a>
                  </div>
                </Td>
                <Td className="text-gold font-medium">{lead.budget ? formatCurrency(lead.budget) : '—'}</Td>
                <Td><span className="text-xs text-slate">{getSourceLabel(lead.source)}</span></Td>
                <Td>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getLeadStatusColor(lead.status)}`}>
                    {getLeadStatusLabel(lead.status)}
                  </span>
                </Td>
                <Td>
                  {lead.assignedTo ? (
                    <span className="text-xs text-slate-light">{lead.assignedTo.name}</span>
                  ) : <span className="text-xs text-slate">Unassigned</span>}
                </Td>
                <Td>
                  {lead.nextFollowupDate ? (
                    <span className={`text-xs ${new Date(lead.nextFollowupDate) < new Date() ? 'text-red-400' : 'text-slate-light'}`}>
                      {formatDate(lead.nextFollowupDate)}
                    </span>
                  ) : '—'}
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <Link href={`/leads/${lead.id}`}>
                      <button className="p-1.5 text-slate hover:text-white hover:bg-navy-light rounded transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                    </Link>
                    <Link href={`/leads/${lead.id}/edit`}>
                      <button className="p-1.5 text-slate hover:text-gold hover:bg-navy-light rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    </Link>
                    <button onClick={() => { if (confirm('Delete this lead?')) deleteMutation.mutate(lead.id) }}
                      className="p-1.5 text-slate hover:text-red-400 hover:bg-navy-light rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
          {meta.totalPages > 1 && <div className="px-4"><Pagination page={page} totalPages={meta.totalPages} onPageChange={setPage} /></div>}
        </Card>
      ) : (
        /* Pipeline View */
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide min-h-[500px]">
          {pipeline.map((col: any) => (
            <div key={col.status} className="min-w-[200px] flex-shrink-0">
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-2 text-xs font-medium ${getLeadStatusColor(col.status)}`}>
                <span>{getLeadStatusLabel(col.status)}</span>
                <span className="bg-black/20 px-1.5 py-0.5 rounded-full">{col.count}</span>
              </div>
              <div className="space-y-2">
                {col.leads.map((lead: any) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`}>
                    <div className="bg-navy-mid border border-navy-border rounded-lg p-3 hover:border-gold/30 transition-colors cursor-pointer">
                      <p className="text-sm font-medium text-white mb-1">{lead.name}</p>
                      <p className="text-xs text-slate mb-1">{lead.mobile}</p>
                      {lead.budget && <p className="text-xs text-gold font-medium">{formatCurrency(lead.budget)}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[9px] text-slate">{getSourceLabel(lead.source)}</span>
                        <span className="text-[9px] text-slate">{formatRelativeTime(lead.updatedAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Lead Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset() }} title="Add New Lead" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Full Name *</label>
              <input {...register('name', { required: true })} placeholder="Lead name" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Mobile *</label>
              <input {...register('mobile', { required: true })} placeholder="+91 XXXXX XXXXX" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Email</label>
              <input {...register('email')} type="email" placeholder="lead@email.com" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Budget</label>
              <input {...register('budget')} type="number" placeholder="Budget in ₹" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Lead Source *</label>
              <select {...register('source', { required: true })} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                <option value="">Select source</option>
                {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Property Type</label>
              <select {...register('propertyType')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                <option value="">Select type</option>
                {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">City</label>
              <input {...register('city')} placeholder="City" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Next Followup Date</label>
              <input {...register('nextFollowupDate')} type="date" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Remarks</label>
            <textarea {...register('remarks')} rows={3} placeholder="Any notes about this lead..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={createMutation.isPending} className="flex-1">Create Lead</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); reset() }}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
