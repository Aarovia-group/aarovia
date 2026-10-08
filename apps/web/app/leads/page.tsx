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

const LEAD_IMPORT_HEADERS = ['name', 'mobile', 'email', 'budget', 'city', 'source', 'status', 'propertyType', 'project', 'assignedTo', 'remarks', 'nextFollowupDate']
const LEAD_IMPORT_TEMPLATE = [
  LEAD_IMPORT_HEADERS.join(','),
  'Sample Lead,+919876543210,sample@example.com,5000000,Bengaluru,WEBSITE,NEW,APARTMENT,,,Interested in a 2-bedroom apartment,',
].join('\n')

const parseCsv = (text: string) => {
  const rows: string[][] = []
  let row: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const next = text[index + 1]
    if (character === '"' && quoted && next === '"') {
        current += '"'
        index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(current.trim())
      current = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1
      row.push(current.trim())
      if (row.some(value => value)) rows.push(row)
      row = []
      current = ''
    } else {
      current += character
    }
  }

  if (quoted) throw new Error('CSV contains an unclosed quoted value')
  row.push(current.trim())
  if (row.some(value => value)) rows.push(row)
  return rows
}

export default function LeadsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'list' | 'pipeline'>('list')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importError, setImportError] = useState('')
  const [importSummary, setImportSummary] = useState<any>(null)
  const [isImporting, setIsImporting] = useState(false)

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

  const downloadImportTemplate = () => {
    const url = URL.createObjectURL(new Blob([LEAD_IMPORT_TEMPLATE], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'lead-import-template.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!importFile) {
      setImportError('Select a CSV file to import')
      return
    }

    try {
      setImportError('')
      setImportSummary(null)
      setIsImporting(true)
      const rows = parseCsv((await importFile.text()).replace(/^\uFEFF/, ''))
      if (rows.length < 2) throw new Error('CSV must contain a header row and at least one lead')

      const fieldAliases: Record<string, string> = {
        name: 'name', fullname: 'name', leadname: 'name',
        mobile: 'mobile', phone: 'mobile', phonenumber: 'mobile',
        email: 'email', emailaddress: 'email', city: 'city',
        budget: 'budget', budgetamount: 'budget', source: 'source', status: 'status',
        property: 'propertyType', propertytype: 'propertyType',
        project: 'projectName', projectname: 'projectName', projectid: 'projectId',
        assignedto: 'assignedToName', assignedtoname: 'assignedToName',
        remarks: 'remarks', nextfollowup: 'nextFollowupDate',
        nextfollowupdate: 'nextFollowupDate', followupdate: 'nextFollowupDate',
      }
      const headers = rows[0].map(header => header.toLowerCase().replace(/[^a-z0-9]/g, ''))
      const unknownHeaders = headers.filter(header => !fieldAliases[header])
      if (unknownHeaders.length) throw new Error(`Unknown CSV columns: ${unknownHeaders.join(', ')}`)
      if (!headers.some(header => fieldAliases[header] === 'name') || !headers.some(header => fieldAliases[header] === 'mobile')) {
        throw new Error('CSV must include Name and Mobile columns')
      }
      if (rows.length - 1 > 1000) throw new Error('Import up to 1,000 leads per CSV file')

      const legacyStatuses: Record<string, string> = {
        warm: 'FOLLOWUP',
        hot: 'INTERESTED',
        cold: 'OPPORTUNITY_NOT_INTERESTED',
        closed: 'OPPORTUNITY_CLOSED',
        booked: 'BOOKED',
      }
      const leads = rows.slice(1).map((values, index) => {
        if (values.length !== headers.length) throw new Error(`Row ${index + 2} has ${values.length} values; expected ${headers.length}`)
        const lead = headers.reduce<Record<string, string>>((record, header, valueIndex) => {
          const field = fieldAliases[header]
          if (values[valueIndex]) record[field] = values[valueIndex]
          return record
        }, {})
        if (lead.propertyType && !PROPERTY_TYPES.some(type => type.value === lead.propertyType.toUpperCase())) {
          lead.projectName = lead.projectName || lead.propertyType
          delete lead.propertyType
        }
        if (lead.mobile) {
          const digits = lead.mobile.replace(/\D/g, '')
          if (digits.length === 10 && /^[6-9]/.test(digits)) lead.mobile = `+91${digits}`
          else if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) lead.mobile = `+91${digits.slice(1)}`
          else if (lead.mobile.startsWith('+')) lead.mobile = `+${digits}`
        }
        const source = (lead.source || '').trim().toLowerCase()
        lead.source = source === 'cp' || source === 'ref'
          ? 'REFERRAL'
          : source === 'direct' || !source
            ? 'DIRECT_CALL'
            : source.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
        const status = (lead.status || '').trim().toLowerCase()
        lead.status = legacyStatuses[status] || (status ? status.toUpperCase().replace(/[^A-Z0-9]+/g, '_') : 'NEW')
        if (lead.budget) {
          const budget = Number(lead.budget.replace(/[,₹\s]/g, ''))
          if (!Number.isFinite(budget) || budget < 0) throw new Error(`Row ${index + 2} has an invalid budget`)
          lead.budget = String(budget)
        }
        if (!lead.name) throw new Error(`Row ${index + 2} is missing a lead name`)
        if (!lead.mobile) throw new Error(`Row ${index + 2} is missing a mobile number`)
        if (lead.source && !LEAD_SOURCES.some(source => source.value === lead.source.toUpperCase())) {
          throw new Error(`Row ${index + 2} has an invalid source`)
        }
        if (lead.status && !LEAD_STATUSES.some(status => status.value === lead.status.toUpperCase())) {
          throw new Error(`Row ${index + 2} has an invalid status`)
        }
        if (lead.nextFollowupDate && Number.isNaN(Date.parse(lead.nextFollowupDate))) {
          throw new Error(`Row ${index + 2} has an invalid next follow-up date`)
        }
        return {
          ...lead,
          source: lead.source.toUpperCase(),
          status: lead.status.toUpperCase(),
          propertyType: lead.propertyType ? lead.propertyType.toUpperCase() : null,
          budget: lead.budget || null,
          email: lead.email || null,
          city: lead.city || null,
          remarks: lead.remarks || null,
          nextFollowupDate: lead.nextFollowupDate || null,
        }
      })

      const response = await leadApi.bulkImport(leads)
      const result = response.data?.data
      if (!result) throw new Error('Import response was incomplete; refresh the lead list before retrying')
      setImportSummary(result)
      setImportFile(null)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    } catch (error: any) {
      setImportError(error.response?.data?.message || error.message || 'Lead import failed')
    } finally {
      setIsImporting(false)
    }
  }

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
          <Button variant="secondary" size="sm" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => { setImportFile(null); setImportError(''); setImportSummary(null); setShowImport(true) }}>Import</Button>
          <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}>Export</Button>
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>Add Lead</Button>
        </div>
      }
    >
      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-0 sm:min-w-[200px]">
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
                    <Link href={`/leads/${lead.id}`} className="lead-name-link font-medium text-[#172033] hover:text-gold transition-colors">{lead.name || 'Unnamed lead'}</Link>
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
            <div key={col.status} className="min-w-[180px] flex-shrink-0">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <Modal open={showImport} onClose={() => { setShowImport(false); setImportFile(null); setImportError(''); setImportSummary(null) }} title="Import Leads" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-light">Download the sample CSV, fill in each lead&apos;s name and mobile number, then upload it. Optional columns can be left blank.</p>
          <div className="rounded-lg border border-navy-border bg-navy-mid p-3">
            <p className="text-xs font-medium text-slate-light mb-2">CSV columns</p>
            <p className="text-xs font-mono text-slate break-all">{LEAD_IMPORT_HEADERS.join(',')}</p>
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={event => { setImportFile(event.target.files?.[0] || null); setImportError(''); setImportSummary(null) }}
            className="w-full text-sm text-slate-light file:mr-3 file:rounded-md file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-gold"
          />
          {importError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{importError}</p>}
          {importSummary && (
            <div role="status" className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700">
              <p>Created: {importSummary.created}</p>
              <p>Duplicates imported: {importSummary.duplicates}</p>
              <p>Rows with errors: {importSummary.errors}</p>
              {importSummary.rowErrors?.length > 0 && <p className="mt-2 text-xs">{importSummary.rowErrors.map((rowError: any) => `Row ${rowError.row}: ${rowError.message}`).join('; ')}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleImport} loading={isImporting} disabled={!importFile} className="flex-1">Upload CSV</Button>
            <Button type="button" variant="secondary" icon={<Download className="w-3.5 h-3.5" />} onClick={downloadImportTemplate}>Download Sample CSV</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
