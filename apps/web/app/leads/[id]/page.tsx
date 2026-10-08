'use client'

import { FormEvent, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Modal } from '@/components/ui/index'
import { leadApi, emailApi, uploadApi, whatsappApi, voiceApi, smsApi } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime, getLeadStatusColor, getLeadStatusLabel, getSourceLabel, LEAD_STATUSES } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Phone, Mail, MessageSquare, MapPin, Calendar, Edit2, ArrowLeft, Plus, FileText, Activity, Clock, User, Building2, Banknote, Send, CheckCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'activity' | 'calls' | 'notes' | 'quotations' | 'visits'>('activity')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailResult, setEmailResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageChannel, setMessageChannel] = useState<'SMS' | 'WHATSAPP'>('WHATSAPP')
  const [messageText, setMessageText] = useState('')
  const [selectedCallIds, setSelectedCallIds] = useState<string[]>([])
  const [editingCallId, setEditingCallId] = useState<string | null>(null)
  const [callDisposition, setCallDisposition] = useState('')
  const [callDetails, setCallDetails] = useState('')
  const [voiceCall, setVoiceCall] = useState<{ callLogId: string | null } | null>(null)
  const [isCalling, setIsCalling] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadApi.getById(id),
    enabled: !!id,
    refetchInterval: 5000,
  })

  const lead = data?.data?.data

  const updateStatusMutation = useMutation({
    mutationFn: (data: any) => leadApi.updateStatus(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lead', id] }); setShowStatusModal(false); toast.success('Status updated') },
    onError: () => toast.error('Failed to update status'),
  })

  const updateCallMutation = useMutation({
    mutationFn: ({ callId, data }: { callId: string; data: { outcome: string; notes: string } }) => leadApi.updateCallLog(id, callId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      setEditingCallId(null)
      toast.success('Call details updated')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update call details'),
  })

  const deleteCallMutation = useMutation({
    mutationFn: (callId: string) => leadApi.deleteCallLog(id, callId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lead', id] }); toast.success('Call record deleted') },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to delete call record'),
  })

  const deleteCallsMutation = useMutation({
    mutationFn: (callIds: string[]) => leadApi.deleteCallLogs(id, callIds),
    onSuccess: (response) => {
      setSelectedCallIds([])
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      toast.success(response.data?.message || 'Call records deleted')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to delete call records'),
  })

  const addNoteMutation = useMutation({
    mutationFn: (data: any) => leadApi.addNote(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lead', id] }); setShowNoteModal(false); toast.success('Note added') },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to add note'),
  })

  const scheduleVisitMutation = useMutation({
    mutationFn: (data: any) => leadApi.scheduleSiteVisit(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lead', id] }); setShowVisitModal(false); toast.success('Site visit scheduled') },
    onError: () => toast.error('Failed to schedule site visit'),
  })

  const sendEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      const files = Array.from(data.attachments || []) as File[]
      const uploadedFiles = await Promise.all(files.map(async (file) => {
        const response = await uploadApi.uploadDocument(file)
        const uploaded = response.data?.data
        if (!uploaded?.url) throw new Error('File upload failed')
        return { url: uploaded.url, name: uploaded.name }
      }))

      return emailApi.sendProjectDetails({
        leadId: id,
        ...data,
        brochureUrl: uploadedFiles[0]?.url,
        attachments: uploadedFiles,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      setEmailResult({ type: 'success', message: 'Email sent successfully. Check the recipient inbox or spam folder.' })
      toast.success('Email sent successfully')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Failed to send email'
      setEmailResult({ type: 'error', message })
      toast.error(message)
    },
  })

  const sendMessageMutation = useMutation({
    mutationFn: () => messageChannel === 'SMS'
      ? smsApi.sendCustom({ leadId: id, message: messageText })
      : whatsappApi.sendCustom({ leadId: id, message: messageText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      setShowMessageModal(false)
      setMessageText('')
      toast.success(`${messageChannel} sent`)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || `Failed to send ${messageChannel}`),
  })

  const openMessageModal = (channel: 'SMS' | 'WHATSAPP') => {
    setMessageChannel(channel)
    setMessageText(channel === 'WHATSAPP'
      ? `Hello ${lead?.name || 'there'}, thank you for your interest in Aarovia Real Estates.`
      : `Hello ${lead?.name || 'there'}, thank you for your interest in Aarovia Real Estates.`)
    setShowMessageModal(true)
  }

  const toggleVoiceCall = async () => {
    if (voiceCall) {
      if (!voiceCall.callLogId) {
        toast.error('This call has no CRM call-log ID and cannot be released from here')
        return
      }
      try {
        setIsCalling(true)
        await voiceApi.releaseCall(id, voiceCall.callLogId)
        setVoiceCall(null)
        queryClient.invalidateQueries({ queryKey: ['lead', id] })
        toast.success('Call release request sent to MCUBE')
      } catch (error: any) {
        toast.error(error.response?.data?.message || error.message || 'Unable to end call')
      } finally {
        setIsCalling(false)
      }
      return
    }

    try {
      setIsCalling(true)
      const response = await voiceApi.startCall(lead.mobile.trim(), id)
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      setVoiceCall({ callLogId: response.data?.data?.callLogId || null })
      toast.success('Call initiated')
    } catch (error: any) {
      setIsCalling(false)
      toast.error(error.response?.data?.message || error.message || 'Unable to start call')
    }
  }

  const { register, handleSubmit, reset } = useForm()

  const submitStatus = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    updateStatusMutation.mutate({
      status: String(form.get('status') || ''),
      remarks: String(form.get('remarks') || ''),
    })
  }

  const submitNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = String(new FormData(event.currentTarget).get('content') || '').trim()
    if (!content) {
      toast.error('Note cannot be empty')
      return
    }
    addNoteMutation.mutate({ content })
  }

  if (isLoading) return <AppLayout title="Lead Detail"><div className="flex items-center justify-center h-64"><div className="text-slate">Loading...</div></div></AppLayout>
  if (!lead) return <AppLayout title="Lead Not Found"><div className="text-slate text-center py-16">Lead not found</div></AppLayout>

  const activityIcons: Record<string, any> = {
    LEAD_CREATED: <Plus className="w-3.5 h-3.5 text-green-400" />,
    STATUS_CHANGED: <Activity className="w-3.5 h-3.5 text-blue-400" />,
    CALL_LOGGED: <Phone className="w-3.5 h-3.5 text-orange-400" />,
    EMAIL_SENT: <Mail className="w-3.5 h-3.5 text-green-400" />,
    WHATSAPP_SENT: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
    NOTE_ADDED: <FileText className="w-3.5 h-3.5 text-purple-400" />,
    LEAD_ASSIGNED: <User className="w-3.5 h-3.5 text-gold" />,
    BOOKING_CREATED: <CheckCircle className="w-3.5 h-3.5 text-gold" />,
  }

  return (
    <AppLayout
      title={lead.name}
      subtitle={`${getSourceLabel(lead.source)} · ${lead.mobile}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => router.back()}>Back</Button>
          <button id="lead-call-client" type="button" onClick={toggleVoiceCall} disabled={isCalling} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium !text-white transition-colors hover:bg-green-500 disabled:cursor-wait disabled:opacity-60">
            <Phone className="w-3.5 h-3.5" />{isCalling ? (voiceCall ? 'Ending...' : 'Connecting...') : voiceCall ? 'End Call' : 'Call Client'}
          </button>
          <Button variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />} onClick={() => openMessageModal('WHATSAPP')}>WhatsApp</Button>
          <Button variant="secondary" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => openMessageModal('SMS')}>Send SMS</Button>
          <Button variant="secondary" size="sm" icon={<Mail className="w-3.5 h-3.5" />} onClick={() => router.push('/email')}>Send Email</Button>
          <Button id="lead-update-status" size="sm" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => setShowStatusModal(true)}>Update Status</Button>
        </div>
      }
    >
      <style jsx global>{`
        #lead-call-client,
        #lead-update-status {
          color: #fff !important;
        }

        #lead-call-client svg,
        #lead-update-status svg {
          color: #fff !important;
        }
      `}</style>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Lead Info */}
        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-navy border border-navy-border flex items-center justify-center text-lg font-bold text-gold">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-medium text-white">{lead.name}</h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getLeadStatusColor(lead.status)}`}>
                    {getLeadStatusLabel(lead.status)}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: <Phone className="w-3.5 h-3.5" />, label: 'Mobile', value: lead.mobile },
                  { icon: <Mail className="w-3.5 h-3.5" />, label: 'Email', value: lead.email || '—' },
                  { icon: <MapPin className="w-3.5 h-3.5" />, label: 'City', value: lead.city || '—' },
                  { icon: <Banknote className="w-3.5 h-3.5" />, label: 'Budget', value: lead.budget ? formatCurrency(lead.budget) : '—' },
                  { icon: <Building2 className="w-3.5 h-3.5" />, label: 'Property Type', value: lead.propertyType || '—' },
                  { icon: <User className="w-3.5 h-3.5" />, label: 'Source', value: getSourceLabel(lead.source) },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <div className="text-slate flex-shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-slate block">{item.label}</span>
                        <span className="text-xs text-slate-light">{item.value}</span>
                    </div>
                      {item.label === 'Mobile' && <a href={`tel:${lead.mobile}`} aria-label={`Call ${lead.name}`} className="text-green-400 hover:text-green-300" title="Call client"><Phone className="w-4 h-4" /></a>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Followup */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium text-white">Next Followup</span>
              </div>
              {lead.nextFollowupDate ? (
                <p className={`text-sm ${new Date(lead.nextFollowupDate) < new Date() ? 'text-red-400' : 'text-green-400'}`}>
                  {formatDate(lead.nextFollowupDate)}
                </p>
              ) : (
                <p className="text-xs text-slate">No followup scheduled</p>
              )}
            </CardContent>
          </Card>

          {/* Assigned To */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium text-white">Assigned To</span>
              </div>
              {lead.assignedTo ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-navy-light border border-navy-border flex items-center justify-center text-[10px] font-bold text-gold">
                    {lead.assignedTo.name.charAt(0)}
                  </div>
                  <span className="text-sm text-slate-light">{lead.assignedTo.name}</span>
                </div>
              ) : <p className="text-xs text-slate">Unassigned</p>}
            </CardContent>
          </Card>

          {/* Remarks */}
          {lead.remarks && (
            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1.5">Remarks</p>
                <p className="text-sm text-slate-light leading-relaxed">{lead.remarks}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Timeline & Tabs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { label: 'Activities', value: lead._count?.activities || 0, color: 'text-blue-400' },
              { label: 'Calls', value: lead._count?.callLogs || 0, color: 'text-orange-400' },
              { label: 'Quotations', value: lead.quotations?.length || 0, color: 'text-gold' },
              { label: 'Tasks', value: lead._count?.tasks || 0, color: 'text-purple-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-navy-mid border border-navy-border rounded-lg p-3 text-center">
                <div className={`text-xl font-display font-medium ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-slate mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          <Card>
            {/* Tabs */}
            <div className="flex border-b border-navy-border overflow-x-auto scrollbar-hide">
              {[
                { key: 'activity', label: 'Timeline' },
                { key: 'calls', label: 'Call Logs' },
                { key: 'notes', label: 'Notes' },
                { key: 'quotations', label: 'Quotations' },
                { key: 'visits', label: 'Site Visits' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key ? 'border-gold text-gold' : 'border-transparent text-slate hover:text-white'}`}
                >
                  {tab.label}
                </button>
              ))}
              <div className="flex-1" />
              <button onClick={() => setShowNoteModal(true)} className="px-3 py-2 text-xs text-gold hover:text-gold-light transition-colors flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />Add Note
              </button>
            </div>

            <CardContent>
              {/* Activity Timeline */}
              {activeTab === 'activity' && (
                <div className="space-y-0">
                  {lead.activities?.length === 0 && <p className="text-sm text-slate text-center py-8">No activity yet</p>}
                  {lead.activities?.map((act: any, i: number) => (
                    <div key={act.id} className="flex gap-3 pb-4 relative">
                      {i < lead.activities.length - 1 && <div className="absolute left-[13px] top-7 bottom-0 w-px bg-navy-border" />}
                      <div className="w-7 h-7 rounded-full bg-navy border border-navy-border flex items-center justify-center flex-shrink-0 z-10">
                        {activityIcons[act.type] || <Activity className="w-3.5 h-3.5 text-slate" />}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm text-slate-light">{act.description}</p>
                        <p className="text-[10px] text-slate mt-0.5">{formatRelativeTime(act.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Call Logs */}
              {activeTab === 'calls' && (
                <div className="space-y-3">
                  {lead.callLogs?.length > 0 && (
                    <div className="flex items-center justify-between gap-3 px-1">
                      <label className="flex items-center gap-2 text-xs text-slate-light">
                        <input
                          type="checkbox"
                          checked={selectedCallIds.length === lead.callLogs.length}
                          onChange={(event) => setSelectedCallIds(event.target.checked ? lead.callLogs.map((call: any) => call.id) : [])}
                          className="accent-gold"
                        />
                        Select all calls
                      </label>
                      {selectedCallIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete ${selectedCallIds.length} selected call record(s)?`)) deleteCallsMutation.mutate(selectedCallIds)
                          }}
                          disabled={deleteCallsMutation.isPending}
                          className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete selected ({selectedCallIds.length})
                        </button>
                      )}
                    </div>
                  )}
                  {lead.callLogs?.length === 0 && <p className="text-sm text-slate text-center py-8">No calls logged yet</p>}
                  {lead.callLogs?.map((call: any) => (
                    <div key={call.id} className="bg-navy rounded-lg p-3 border border-navy-border">
                      <div className="flex items-start justify-between">
                        <div className="flex min-w-0 gap-2">
                          <input
                            type="checkbox"
                            checked={selectedCallIds.includes(call.id)}
                            onChange={(event) => setSelectedCallIds((current) => event.target.checked ? [...current, call.id] : current.filter((id) => id !== call.id))}
                            aria-label={`Select call from ${formatDateTime(call.calledAt)}`}
                            className="mt-0.5 accent-gold"
                          />
                          <div className="min-w-0">
                          <span className="text-xs font-medium text-white">{call.outcome || 'Call logged'}</span>
                          <p className="text-[10px] text-slate mt-1">{formatDateTime(call.calledAt)}</p>
                          {call.notes && <p className="text-xs text-slate mt-1">{call.notes}</p>}
                          {call.recordingUrl && (
                            <div className="mt-2 space-y-1.5">
                              <audio controls preload="metadata" src={call.recordingUrl} className="h-8 max-w-full" />
                              <a href={call.recordingUrl} target="_blank" rel="noreferrer" className="text-xs text-gold hover:text-gold-light inline-block">Open recording</a>
                            </div>
                          )}
                          {!call.recordingUrl && <p className="text-[10px] text-slate mt-2">Recording not received from MCUBE</p>}
                          </div>
                        </div>
                        <button
                          type="button"
                          title="Update call disposition and details"
                          aria-label="Update call disposition and details"
                          onClick={() => {
                            setEditingCallId(call.id)
                            setCallDisposition(call.outcome || '')
                            setCallDetails(call.notes?.split(' | Agent details: ')[1] || '')
                          }}
                          className="ml-3 flex-shrink-0 text-slate hover:text-gold"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete call record"
                          aria-label="Delete call record"
                          onClick={() => {
                            if (window.confirm('Delete this call record and its recording link?')) deleteCallMutation.mutate(call.id)
                          }}
                          disabled={deleteCallMutation.isPending}
                          className="ml-3 flex-shrink-0 text-slate hover:text-red-400 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-slate">By: {call.user?.name}</span>
                        {call.duration && <span className="text-[10px] text-slate">Duration: {call.duration}s</span>}
                      </div>
                      {editingCallId === call.id && (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault()
                            updateCallMutation.mutate({ callId: call.id, data: { outcome: callDisposition, notes: callDetails } })
                          }}
                          className="mt-3 space-y-3 border-t border-navy-border pt-3"
                        >
                          <div>
                            <label className="block text-xs font-medium text-slate-light mb-1.5">Call disposition</label>
                            <select
                              value={callDisposition}
                              onChange={(event) => setCallDisposition(event.target.value)}
                              required
                              className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
                            >
                              <option value="" disabled>Select disposition</option>
                              {!['Connected', 'Not Answered', 'Busy', 'Wrong Number', 'Call Back Later', 'Interested', 'Not Interested', 'Other'].includes(callDisposition) && callDisposition && <option value={callDisposition}>{callDisposition}</option>}
                              {['Connected', 'Not Answered', 'Busy', 'Wrong Number', 'Call Back Later', 'Interested', 'Not Interested', 'Other'].map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-light mb-1.5">Agent details</label>
                            <textarea
                              value={callDetails}
                              onChange={(event) => setCallDetails(event.target.value)}
                              rows={3}
                              placeholder="Add call notes or next steps..."
                              className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" size="sm" onClick={() => setEditingCallId(null)}>Cancel</Button>
                            <Button type="submit" size="sm" loading={updateCallMutation.isPending}>Save details</Button>
                          </div>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {activeTab === 'notes' && (
                <div className="space-y-3">
                  {lead.notes?.length === 0 && <p className="text-sm text-slate text-center py-8">No notes yet</p>}
                  {lead.notes?.map((note: any) => (
                    <div key={note.id} className="bg-navy rounded-lg p-3 border border-navy-border">
                      <p className="text-sm text-slate-light">{note.content}</p>
                      <p className="text-[10px] text-slate mt-2">{formatDateTime(note.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Quotations */}
              {activeTab === 'quotations' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate">{lead.quotations?.length || 0} quotations</span>
                    <Link href={`/quotations/new?leadId=${id}`}><Button size="sm" icon={<Plus className="w-3.5 h-3.5" />}>New Quotation</Button></Link>
                  </div>
                  {lead.quotations?.map((q: any) => (
                    <Link key={q.id} href={`/quotations/${q.id}`}>
                      <div className="bg-navy rounded-lg p-3 border border-navy-border hover:border-gold/30 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-white">{q.quotationNumber}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${q.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 'bg-navy-light text-slate'}`}>{q.status}</span>
                        </div>
                        <p className="text-sm text-gold font-medium mt-1">{formatCurrency(q.totalAmount)}</p>
                        <p className="text-[10px] text-slate mt-0.5">{formatDate(q.createdAt)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Site Visits */}
              {activeTab === 'visits' && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowVisitModal(true)}>Schedule Visit</Button>
                  </div>
                  {lead.siteVisits?.length === 0 && <p className="text-sm text-slate text-center py-8">No site visits scheduled</p>}
                  {lead.siteVisits?.map((v: any) => (
                    <div key={v.id} className="bg-navy rounded-lg p-3 border border-navy-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white">{formatDateTime(v.scheduledAt)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${v.isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {v.isCompleted ? 'Completed' : 'Scheduled'}
                        </span>
                      </div>
                      {v.feedback && <p className="text-xs text-slate mt-1">Feedback: {v.feedback}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal open={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Lead Status" size="sm">
        <form onSubmit={submitStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">New Status</label>
            <select name="status" defaultValue={lead.status} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
              {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Remarks</label>
            <textarea name="remarks" rows={3} placeholder="Add remarks..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
          </div>
          <Button type="submit" loading={updateStatusMutation.isPending} className="w-full">Update Status</Button>
        </form>
      </Modal>

      {/* Add Note Modal */}
      <Modal open={showVisitModal} onClose={() => { setShowVisitModal(false); reset() }} title="Schedule Site Visit" size="sm">
        <form onSubmit={handleSubmit((d) => scheduleVisitMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Visit Date and Time *</label>
            <input {...register('scheduledAt', { required: true })} type="datetime-local" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Notes</label>
            <textarea {...register('notes')} rows={3} placeholder="Visit notes..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
          </div>
          <Button type="submit" loading={scheduleVisitMutation.isPending} className="w-full">Schedule Visit</Button>
        </form>
      </Modal>

      {/* Add Note Modal */}
      <Modal open={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add Note" size="sm">
        <form onSubmit={submitNote} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Note</label>
            <textarea name="content" required rows={4} placeholder="Write your note..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
          </div>
          <Button type="submit" loading={addNoteMutation.isPending} className="w-full">Save Note</Button>
        </form>
      </Modal>

      {/* Send Email Modal */}
      <Modal open={showEmailModal} onClose={() => setShowEmailModal(false)} title="Send Project Details" size="sm">
        <form onSubmit={handleSubmit((d) => sendEmailMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">To Email</label>
            <input {...register('toEmail')} type="email" defaultValue={lead.email || ''} placeholder="recipient@email.com" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Template Type</label>
            <select {...register('templateType')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
              {['villa', 'apartment', 'plot', 'farmland', 'commercial'].map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Custom Subject (optional)</label>
            <input {...register('subject')} placeholder="Project details from Aarovia Real Estates" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Custom Message (optional)</label>
            <textarea {...register('customMessage')} rows={3} placeholder="Add a personal message..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
          </div>
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
            <label className="block text-xs font-medium text-gold mb-1.5">Attach Files (optional)</label>
            <input {...register('attachments')} type="file" multiple accept="application/pdf,.doc,.docx,.xls,.xlsx,image/*" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-slate file:mr-3 file:rounded-md file:border-0 file:bg-gold/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gold hover:file:bg-gold/30" />
            <p className="text-[10px] text-slate mt-1.5">Attach brochures, PDFs, or images. Each file can be up to 10MB.</p>
          </div>
          <Button type="submit" icon={<Send className="w-3.5 h-3.5" />} loading={sendEmailMutation.isPending} className="w-full">Send Email</Button>
          {emailResult && (
            <div className={`rounded-lg border px-3 py-2 text-xs ${emailResult.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
              {emailResult.message}
            </div>
          )}
        </form>
      </Modal>

      <Modal open={showMessageModal} onClose={() => setShowMessageModal(false)} title={`Send ${messageChannel}`} size="sm">
        <div className="space-y-4">
          <div className="flex gap-2 rounded-lg bg-navy p-1">
            {(['WHATSAPP', 'SMS'] as const).map(channel => (
              <button
                key={channel}
                type="button"
                onClick={() => { setMessageChannel(channel); setMessageText('') }}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${messageChannel === channel ? 'bg-gold text-navy' : 'text-slate hover:text-white'}`}
              >
                {channel}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">To</label>
            <div className="rounded-lg border border-navy-border bg-navy px-3 py-2 text-sm text-slate-light">{lead.mobile}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Message</label>
            <textarea
              value={messageText}
              onChange={event => setMessageText(event.target.value)}
              rows={6}
              maxLength={messageChannel === 'SMS' ? 1600 : 4096}
              placeholder={`Type your ${messageChannel.toLowerCase()} message...`}
              className="w-full resize-none rounded-lg border border-navy-border bg-navy px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
            />
            <p className="mt-1 text-right text-[10px] text-slate">{messageText.length} characters</p>
          </div>
          <Button
            type="button"
            icon={<Send className="w-3.5 h-3.5" />}
            loading={sendMessageMutation.isPending}
            disabled={!messageText.trim()}
            onClick={() => sendMessageMutation.mutate()}
            className="w-full"
          >
            Send {messageChannel}
          </Button>
        </div>
      </Modal>
    </AppLayout>
  )
}
