'use client'

import { ChangeEvent, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, Badge, Table, Tr, Td, SearchInput, Select, Pagination, EmptyState, Modal, Input, Textarea, StatCard } from '@/components/ui/index'
import { emailApi, leadApi, smsApi, whatsappApi } from '@/lib/api'
import api from '@/lib/api'
import { usePermissions } from '@/hooks'
import { formatCurrency, formatDate, formatRelativeTime, getLeadStatusColor, getLeadStatusLabel, getSourceLabel, LEAD_STATUSES, LEAD_SOURCES, PROPERTY_TYPES } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Plus, Download, Upload, FileDown, Phone, Mail, MessageSquare, Users, LayoutList, Kanban, Filter, Eye, Edit2, Trash2, UserPlus, Calendar, Send, Building2 } from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { isValidInternationalPhone, normalizeInternationalPhone } from '@/lib/phone'

export default function LeadsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'list' | 'pipeline'>('list')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showBulkMessage, setShowBulkMessage] = useState(false)
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [bulkAssignee, setBulkAssignee] = useState('')
  const [bulkProject, setBulkProject] = useState('')
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [bulkChannel, setBulkChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp')
  const [bulkMessage, setBulkMessage] = useState('')
  const [bulkSubject, setBulkSubject] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const { isAdmin } = usePermissions()

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, search, statusFilter, sourceFilter, projectFilter],
    queryFn: () => leadApi.getAll({ page, limit: 20, search: search || undefined, status: statusFilter || undefined, source: sourceFilter || undefined, projectId: projectFilter || undefined }),
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'active'],
    queryFn: () => api.get('/projects', { params: { isActive: true } }),
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

  const { data: usersData } = useQuery({
    queryKey: ['active-team-members'],
    queryFn: () => api.get('/users', { params: { limit: 100 } }),
    enabled: isAdmin,
  })
  const activeTeamMembers = (usersData?.data?.data || []).filter((user: any) => user.isActive)
  const sourceTeamMembers = usersData?.data?.data || []

  const { data: transferCountData, isFetching: isTransferCountLoading } = useQuery({
    queryKey: ['lead-transfer-count', transferFrom],
    queryFn: () => leadApi.getAll({ assignedToId: transferFrom, limit: 1 }),
    enabled: isAdmin && Boolean(transferFrom),
  })
  const transferLeadCount = transferCountData?.data?.meta?.total || 0

  const bulkAssignMutation = useMutation({
    mutationFn: () => leadApi.bulkAssign({ leadIds: selectedLeadIds, assignedToId: bulkAssignee }),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setSelectedLeadIds([])
      setBulkAssignee('')
      toast.success(response.data?.message || 'Leads assigned successfully')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to assign leads'),
  })

  const transferLeadsMutation = useMutation({
    mutationFn: () => leadApi.transferAgentLeads({ fromAssignedToId: transferFrom, toAssignedToId: transferTo }),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead-transfer-count'] })
      setTransferFrom('')
      setTransferTo('')
      toast.success(response.data?.message || 'Agent leads transferred successfully')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to transfer agent leads'),
  })

  const confirmTransferAgentLeads = () => {
    const source = sourceTeamMembers.find((user: any) => user.id === transferFrom)
    const destination = activeTeamMembers.find((user: any) => user.id === transferTo)
    if (!source || !destination || transferLeadCount < 1) return
    const confirmed = window.confirm(
      `Transfer all ${transferLeadCount} active leads from ${source.name} to ${destination.name}? Lead notes, calls, tasks, and activity history will be kept.`,
    )
    if (confirmed) transferLeadsMutation.mutate()
  }

  const bulkProjectMutation = useMutation({
    mutationFn: () => leadApi.bulkAssignProject({ leadIds: selectedLeadIds, projectId: bulkProject }),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setSelectedLeadIds([])
      setBulkProject('')
      toast.success(response.data?.message || 'Project assigned successfully')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to assign project'),
  })

  const bulkMessageMutation = useMutation({
    mutationFn: () => {
      const payload = { leadIds: selectedLeadIds, message: bulkMessage, ...(bulkChannel === 'email' ? { subject: bulkSubject } : {}) }
      if (bulkChannel === 'whatsapp') return whatsappApi.sendBulk(payload)
      if (bulkChannel === 'sms') return smsApi.sendBulk(payload)
      return emailApi.sendBulk(payload)
    },
    onSuccess: (response: any) => {
      toast.success(response.data?.message || 'Bulk message sent')
      setShowBulkMessage(false)
      setBulkMessage('')
      setBulkSubject('')
      setSelectedLeadIds([])
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to send bulk message'),
  })

  const leads = data?.data?.data || []
  const meta = data?.data?.meta || {}
  const pipeline = pipelineData?.data?.data || []
  const projects = projectsData?.data?.data || []
  const allVisibleSelected = leads.length > 0 && leads.every((lead: any) => selectedLeadIds.includes(lead.id))

  const toggleVisibleLeads = () => {
    setSelectedLeadIds(current => allVisibleSelected
      ? current.filter(id => !leads.some((lead: any) => lead.id === id))
      : Array.from(new Set([...current, ...leads.map((lead: any) => lead.id)])))
  }

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const onSubmit = (data: any) => createMutation.mutate({ ...data, projectId: data.projectId || null })

  const parseCSV = (text: string) => {
    const rows: string[][] = []
    let row: string[] = []
    let value = ''
    let quoted = false

    for (let index = 0; index < text.length; index++) {
      const character = text[index]
      const next = text[index + 1]
      if (character === '"' && quoted && next === '"') { value += '"'; index++; continue }
      if (character === '"') { quoted = !quoted; continue }
      if (character === ',' && !quoted) { row.push(value.trim()); value = ''; continue }
      if ((character === '\n' || character === '\r') && !quoted) {
        if (character === '\r' && next === '\n') index++
        row.push(value.trim());
        if (row.some(Boolean)) rows.push(row)
        row = []; value = ''; continue
      }
      value += character
    }
    row.push(value.trim())
    if (row.some(Boolean)) rows.push(row)
    return rows
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      setIsImporting(true)
      const rows = parseCSV(await file.text())
      if (rows.length < 2) throw new Error('CSV must include a header row and at least one lead')
      const headers = rows[0].map(header => header.toLowerCase().replace(/[^a-z0-9]/g, ''))
      const fieldAliases: Record<string, string> = {
        name: 'name', fullname: 'name', leadname: 'name',
        mobile: 'mobile', phone: 'mobile', phonenumber: 'mobile',
        email: 'email', emailaddress: 'email', city: 'city',
        budget: 'budget', budgetamount: 'budget', source: 'source', status: 'status',
        property: 'propertyType', propertytype: 'propertyType',
        project: 'projectId', projectid: 'projectId', remarks: 'remarks',
        nextfollowupdate: 'nextFollowupDate', followupdate: 'nextFollowupDate',
      }
      const unknownHeaders = headers.filter(header => !fieldAliases[header])
      if (unknownHeaders.length) throw new Error(`Unknown CSV columns: ${unknownHeaders.join(', ')}`)
      const leads = rows.slice(1).map((columns, index) => {
        const rowNumber = index + 2
        if (columns.length !== headers.length) {
          throw new Error(`Row ${rowNumber} has ${columns.length} values; expected ${headers.length}`)
        }
        const lead: Record<string, string> = {}
        columns.forEach((column, index) => {
          const field = fieldAliases[headers[index]]
          if (column) lead[field] = field === 'mobile' ? normalizeInternationalPhone(column) : column
        })
        if (!lead.name || !lead.mobile) throw new Error(`Row ${rowNumber} requires name and mobile`)
        if (!isValidInternationalPhone(lead.mobile)) throw new Error(`Row ${rowNumber} mobile must include a country code, e.g. +919876543210`)
        if (lead.budget && !Number.isFinite(Number(lead.budget))) throw new Error(`Row ${rowNumber} has an invalid budget`)
        return lead
      })

      const response = await leadApi.bulkImport(leads)
      const result = response.data?.data
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      if (result?.errors && !result?.created && !result?.duplicates) {
        toast.error(`Import failed for all ${result.errors} rows`)
      } else {
        toast.success(`Imported ${result?.created || 0} leads${result?.duplicates ? `, ${result.duplicates} duplicates` : ''}${result?.errors ? `, ${result.errors} rows failed` : ''}`)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const response = await leadApi.getAll({ limit: 5000, search: search || undefined, status: statusFilter || undefined, source: sourceFilter || undefined, projectId: projectFilter || undefined })
      const exportLeads = response.data?.data || []
      if (!exportLeads.length) { toast.error('No leads to export'); return }
      const headers = ['Name', 'Mobile', 'Email', 'City', 'Budget', 'Source', 'Status', 'Project', 'Assigned To', 'Next Followup']
      const rows = exportLeads.map((lead: any) => [
        lead.name, lead.mobile, lead.email, lead.city, lead.budget, lead.source, lead.status,
        lead.project?.name, lead.assignedTo?.name, lead.nextFollowupDate,
      ].map(value => {
        const text = value == null ? '' : String(value)
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
      }).join(','))
      const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success(`${exportLeads.length} leads exported`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const downloadImportTemplate = () => {
    const headers = ['name', 'mobile', 'email', 'city', 'budget', 'source', 'status', 'propertyType', 'projectId', 'remarks', 'nextFollowupDate']
    const example = ['Example Lead', '9876543210', 'example@email.com', 'Bangalore', '5000000', 'WEBSITE', 'NEW', 'APARTMENT', '', 'Replace this example row', '']
    const csv = [headers, example].map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'lead_import_template.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Sample CSV downloaded')
  }

  return (
    <AppLayout
      title="Lead Management"
      subtitle={`${meta.total || 0} total leads`}
      actions={
        <div className="flex items-center gap-2">
          <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
          <Button variant="secondary" size="sm" loading={isImporting} icon={<Upload className="w-3.5 h-3.5" />} onClick={() => importInputRef.current?.click()}>Import</Button>
          <Button variant="ghost" size="sm" icon={<FileDown className="w-3.5 h-3.5" />} onClick={downloadImportTemplate}>Sample CSV</Button>
          <Button variant="secondary" size="sm" loading={isExporting} icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export</Button>
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
        <select
          value={projectFilter}
          onChange={e => { setProjectFilter(e.target.value); setPage(1); setSelectedLeadIds([]) }}
          className="bg-navy-mid border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
        >
          <option value="">All Projects</option>
          {projects.map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}
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

      {isAdmin && (
        <div className="mb-4 rounded-lg border border-[#c58b24]/40 bg-white px-3 py-3">
          <p className="mb-2 text-xs font-semibold text-[#172033]">Transfer all active leads between agents</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={transferFrom}
              onChange={event => { setTransferFrom(event.target.value); setTransferTo('') }}
              className="rounded-md border border-[#d8e0e8] bg-white px-2 py-1.5 text-xs text-[#172033]"
            >
              <option value="">From agent</option>
              {sourceTeamMembers.map((user: any) => (
                <option key={user.id} value={user.id}>{user.name}{user.isActive ? '' : ' (inactive)'}</option>
              ))}
            </select>
            <span className="text-xs text-[#64748b]">to</span>
            <select
              value={transferTo}
              onChange={event => setTransferTo(event.target.value)}
              className="rounded-md border border-[#d8e0e8] bg-white px-2 py-1.5 text-xs text-[#172033]"
            >
              <option value="">Destination agent</option>
              {activeTeamMembers.filter((user: any) => user.id !== transferFrom).map((user: any) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            <span className="text-xs text-[#475569]">
              {isTransferCountLoading ? 'Counting leads…' : `${transferLeadCount} active lead${transferLeadCount === 1 ? '' : 's'}`}
            </span>
            <Button
              size="sm"
              icon={<UserPlus className="w-3.5 h-3.5" />}
              disabled={!transferFrom || !transferTo || transferLeadCount === 0 || isTransferCountLoading}
              loading={transferLeadsMutation.isPending}
              onClick={confirmTransferAgentLeads}
            >
              Transfer All Leads
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-[#64748b]">Transfers all active leads owned by the source agent. Existing lead records and history are preserved.</p>
        </div>
      )}

      {isAdmin && selectedLeadIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gold/40 bg-gold-pale px-3 py-2">
          <span className="text-xs font-medium text-[#7c5310]">{selectedLeadIds.length} selected</span>
          <select value={bulkAssignee} onChange={e => setBulkAssignee(e.target.value)} className="rounded-md border border-gold bg-white px-2 py-1.5 text-xs text-[#172033]">
            <option value="">Assign to team member</option>
            {activeTeamMembers.map((user: any) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <Button size="sm" icon={<UserPlus className="w-3.5 h-3.5" />} disabled={!bulkAssignee} loading={bulkAssignMutation.isPending} onClick={() => bulkAssignMutation.mutate()}>Assign Selected</Button>
          <select value={bulkProject} onChange={e => setBulkProject(e.target.value)} className="rounded-md border border-gold bg-white px-2 py-1.5 text-xs text-[#172033]">
            <option value="">Assign to project</option>
            {projects.map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <Button size="sm" icon={<Building2 className="w-3.5 h-3.5" />} disabled={!bulkProject} loading={bulkProjectMutation.isPending} onClick={() => bulkProjectMutation.mutate()}>Assign Project</Button>
          <Button size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => setShowBulkMessage(true)}>Message Selected</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedLeadIds([])}>Clear</Button>
        </div>
      )}

      {view === 'list' ? (
        <Card>
          <Table headers={[...(isAdmin ? [<input key="select-all" type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleLeads} aria-label="Select all visible leads" className="h-4 w-4 accent-[#b27a16]" />] : []), 'Lead', 'Project', 'Mobile', 'Budget', 'Source', 'Status', 'Assigned To', 'Next Followup', 'Actions']}>
            {isLoading ? (
              <tr><td colSpan={isAdmin ? 10 : 9} className="py-12 text-center text-slate text-sm">Loading leads...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={isAdmin ? 10 : 9}><EmptyState icon={<Users className="w-10 h-10" />} title="No leads found" description="Start by adding your first lead or adjust your filters." /></td></tr>
            ) : leads.map((lead: any) => (
              <Tr key={lead.id}>
                {isAdmin && <Td><input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => setSelectedLeadIds(current => current.includes(lead.id) ? current.filter(id => id !== lead.id) : [...current, lead.id])} className="h-4 w-4 accent-[#b27a16]" /></Td>}
                <Td>
                  <div>
                    <Link href={`/leads/${lead.id}`} className="font-medium text-white hover:text-gold transition-colors">{lead.name}</Link>
                    {lead.email && <p className="text-[10px] text-slate">{lead.email}</p>}
                    {lead.city && <p className="text-[10px] text-slate">{lead.city}</p>}
                  </div>
                </Td>
                <Td>
                  <span className="text-xs text-slate-light">{lead.project?.name || 'Unassigned'}</span>
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
      <Modal open={showBulkMessage} onClose={() => setShowBulkMessage(false)} title={`Message ${selectedLeadIds.length} Selected Leads`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Channel</label>
            <select value={bulkChannel} onChange={e => setBulkChannel(e.target.value as typeof bulkChannel)} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
          {bulkChannel === 'email' && (
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Subject</label>
              <input value={bulkSubject} onChange={e => setBulkSubject(e.target.value)} placeholder="Message subject" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Message</label>
            <textarea value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} rows={6} placeholder={`Write the ${bulkChannel} message...`} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" className="flex-1" loading={bulkMessageMutation.isPending} disabled={!bulkMessage.trim() || (bulkChannel === 'email' && !bulkSubject.trim())} icon={<Send className="w-4 h-4" />} onClick={() => bulkMessageMutation.mutate()}>
              Send {bulkChannel === 'whatsapp' ? 'WhatsApp' : bulkChannel.toUpperCase()} to Selected
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowBulkMessage(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset() }} title="Add New Lead" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Full Name *</label>
              <input {...register('name', { required: true })} placeholder="Lead name" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Mobile *</label>
              <input {...register('mobile', { required: 'Mobile is required', validate: value => isValidInternationalPhone(value) || 'Include a valid country code, e.g. +919876543210' })} type="tel" autoComplete="tel" placeholder="+919876543210" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50" />
              {typeof errors.mobile?.message === 'string' && <p className="text-[11px] text-red-400 mt-1">{errors.mobile.message}</p>}
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
              <label className="block text-xs font-medium text-slate-light mb-1.5">Project</label>
              <select {...register('projectId')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                <option value="">No project</option>
                {projects.map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}
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
